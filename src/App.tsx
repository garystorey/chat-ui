import { useAtom } from "jotai";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { messagesAtom, respondingAtom } from "./atoms";
import { ChatHeader, ChatList, Show, Suggestions, ThemeToggle, UserInput } from "./components";
import { ChatWindow } from "./features/";

import type {
  UserInputSendPayload,
  ChatSummary,
  Message,ConnectionStatus
} from "./types";
import {
  useConnectionListeners,
  useTheme,
  useToggleBodyClass,
  usePersistChatHistory,
  useHydrateActiveChat,
  useUnmount,
  useRespondingStatus,
  useAvailableModels,
  useChatCompletionStream,
} from "./hooks";
import {
  buildChatPreview,
  cloneMessages,
  createChatRecordFromMessages,
  getId,
  toChatCompletionMessages,
} from "./utils";

import { ASSISTANT_ERROR_MESSAGE, DEFAULT_CHAT_MODEL, defaultChats, suggestions } from "./config";

import "./App.css";

const App = () => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [isResponding, setResponding] = useAtom(respondingAtom);
  const [inputValue, setInputValue] = useState("");
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>(() =>
    [...defaultChats].sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    "connecting"
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState<"suggestions" | "recent">(
    "suggestions"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const {
    status: chatCompletionStatus,
    reset: resetChatCompletion,
    send: sendChatCompletion,
    pendingRequestRef,
  } = useChatCompletionStream();
  const isNewChat = messages.length === 0;

  const cancelPendingResponse = useCallback(() => {
    if (pendingRequestRef.current) {
      pendingRequestRef.current.abort();
      pendingRequestRef.current = null;
    }

    if (chatCompletionStatus !== "idle") {
      resetChatCompletion();
    }

    setResponding(false);
  }, [chatCompletionStatus, resetChatCompletion, setResponding]);

  useTheme();
  useToggleBodyClass("chat-open", isChatOpen);
  usePersistChatHistory(chatHistory, setChatHistory);
  useRespondingStatus(chatCompletionStatus, setResponding);
  useHydrateActiveChat({
    activeChatId,
    chatHistory,
    setMessages,
    setChatOpen,
  });
  const retryConnection = useConnectionListeners({
    cancelPendingResponse,
    setConnectionStatus,
  });

  useAvailableModels({
    connectionStatus,
    setAvailableModels,
    setSelectedModel,
    setIsLoadingModels,
  });

  useUnmount(cancelPendingResponse);

  const updateActiveChat = useCallback(
    (
      nextMessages: Message[],
      chatId: string | null,
      previewMessage?: Message
    ) => {
      if (!chatId) {
        return;
      }

      const previewCandidate =
        previewMessage ?? nextMessages[nextMessages.length - 1];

      setChatHistory((current) => {
        const existingChat = current.find((chat) => chat.id === chatId);
        const updatedChat = existingChat
          ? {
              ...existingChat,
              preview: buildChatPreview(previewCandidate, existingChat.preview),
              updatedAt: Date.now(),
              messages: cloneMessages(nextMessages),
            }
          : { ...createChatRecordFromMessages(nextMessages), id: chatId };

        const nextHistory = existingChat
          ? current.map((chat) => (chat.id === chatId ? updatedChat : chat))
          : [updatedChat, ...current];

        return nextHistory.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    },
    [setChatHistory]
  );

  const updateAssistantMessageContent = useCallback(
    (
      assistantMessageId: string,
      chatId: string,
      nextContent: string,
      { skipIfUnchanged = false } = {}
    ) => {
      setMessages((current) => {
        let previewMessage: Message | undefined;
        const next = current.map((message) => {
          if (message.id !== assistantMessageId) {
            return message;
          }

          if (skipIfUnchanged && message.content === nextContent) {
            previewMessage = message;
            return message;
          }

          const updated = { ...message, content: nextContent };
          previewMessage = updated;
          return updated;
        });

        if (previewMessage) {
          updateActiveChat(next, chatId, previewMessage);
        }

        return next;
      });
    },
    [setMessages, updateActiveChat]
  );

  const archiveCurrentConversation = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (activeChatId) {
      setChatHistory((current) =>
        current
          .map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  preview: buildChatPreview(lastMessage, chat.preview),
                  updatedAt: Date.now(),
                  messages: cloneMessages(messages),
                }
              : chat
          )
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
      return;
    }

    const newChat = createChatRecordFromMessages(messages);
    setChatHistory((current) =>
      [newChat, ...current].sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }, [activeChatId, messages]);

  const handleSend = useCallback(
    async ({ text }: UserInputSendPayload) => {
      if (!text) {
        return false;
      }

      if (pendingRequestRef.current) {
        return false;
      }

      if (chatCompletionStatus === "error") {
        resetChatCompletion();
      }

      if (!isChatOpen) {
        setChatOpen(true);
      }

      const chatId = activeChatId ?? getId();

      if (!activeChatId) {
        setActiveChatId(chatId);
      }

      const userMessage: Message = {
        id: getId(),
        sender: "user",
        content: text,
      };

      const assistantMessageId = getId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        sender: "bot",
        content: "",
      };

      const conversationForRequest = [...messages, userMessage];
      const handleCompletionError = (error: unknown) => {
        console.error("Chat completion request failed", error);
        updateAssistantMessageContent(
          assistantMessageId,
          chatId,
          ASSISTANT_ERROR_MESSAGE
        );
      };

      setMessages((current) => {
        const next = [...current, userMessage, assistantMessage];
        updateActiveChat(next, chatId, userMessage);
        return next;
      });

      setInputValue("");
      setResponding(true);

      const handleFinalAssistantReply = (finalAssistantReply: string) =>
        updateAssistantMessageContent(assistantMessageId, chatId, finalAssistantReply, {
          skipIfUnchanged: true,
        });

      sendChatCompletion({
        body: {
          model: selectedModel,
          messages: toChatCompletionMessages(conversationForRequest),
          stream: true,
        },
        chatId,
        assistantMessageId,
        onStreamUpdate: (content) =>
          updateAssistantMessageContent(assistantMessageId, chatId, content),
        onStreamComplete: handleFinalAssistantReply,
        onError: handleCompletionError,
        onSettled: () => {
          setResponding(false);
        },
      });

      return true;
    },
    [
      chatCompletionStatus,
      activeChatId,
      isChatOpen,
      messages,
      resetChatCompletion,
      sendChatCompletion,
      setChatOpen,
      setInputValue,
      setActiveChatId,
      setMessages,
      setResponding,
      selectedModel,
      updateActiveChat,
      updateAssistantMessageContent,
    ]
  );

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSuggestionSelect = useCallback(
    (value: string) => {
      setInputValue(value);
      inputRef.current?.focus();
    },
    [inputRef, setInputValue]
  );

  const suggestionItems = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        ...suggestion,
        handleSelect: () => handleSuggestionSelect(suggestion.prompt),
      })),
    [handleSuggestionSelect]
  );

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return chatHistory;
    }

    return chatHistory.filter((chat) => {
      const titleMatch = chat.title.toLowerCase().includes(term);
      const previewMatch = chat.preview.toLowerCase().includes(term);
      return titleMatch || previewMatch;
    });
  }, [chatHistory, searchTerm]);

  const statusLabel = {
    connecting: "Connecting",
    online: "Online",
    offline: "Offline",
  }[connectionStatus];

  const hasHeaderModelOptions = availableModels.length > 0;

  const currentChat = useMemo(() => {
    if (!activeChatId || messages.length === 0) {
      return null;
    }

    const existingChat = chatHistory.find((chat) => chat.id === activeChatId);
    if (existingChat) {
      return {
        ...existingChat,
        messages: cloneMessages(messages),
      };
    }

    return {
      ...createChatRecordFromMessages(messages),
      id: activeChatId,
    };
  }, [activeChatId, messages, chatHistory]);

  const handleNewChat = useCallback(() => {
    cancelPendingResponse();
    archiveCurrentConversation();
    setMessages([]);
    setActiveChatId(null);
    setInputValue("");
    setChatOpen(false);
  }, [
    archiveCurrentConversation,
    cancelPendingResponse,
    setChatOpen,
    setInputValue,
    setMessages,
  ]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      const selectedChat = chatHistory.find((chat) => chat.id === chatId);
      if (!selectedChat) {
        return;
      }

      cancelPendingResponse();
      archiveCurrentConversation();
      setActiveChatId(chatId);
      setMessages(cloneMessages(selectedChat.messages));
      setInputValue("");
      setChatOpen(true);
    },
    [
      archiveCurrentConversation,
      cancelPendingResponse,
      chatHistory,
      setChatOpen,
      setInputValue,
      setMessages,
    ]
  );

  const handleRemoveChat = useCallback(
    (chatId: string) => {
      let removalOccurred = false;
      const isRemovingActiveChat = chatId === activeChatId;

      setChatHistory((current) => {
        if (current.length === 0) {
          return current;
        }

        const filtered = current.filter((chat) => chat.id !== chatId);

        if (filtered.length === current.length) {
          return current;
        }

        removalOccurred = true;

        return filtered;
      });

      if (!removalOccurred) {
        return;
      }

      cancelPendingResponse();

      if (isRemovingActiveChat) {
        setActiveChatId(null);
        setMessages([]);
        setChatOpen(false);
        setInputValue("");
      }
    },
    [
      activeChatId,
      cancelPendingResponse,
      setActiveChatId,
      setChatOpen,
      setInputValue,
      setMessages,
    ]
  );

  const handleSkipToMessages = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById("messages");
      if (target instanceof HTMLElement) {
        target.focus();
      }
    },
    []
  );

  return (
    <article className="app">
      <a href="#messages" className="sr-only skip-link" onClick={handleSkipToMessages}>
        Skip to conversation
      </a>
      <ChatHeader
        handleNewChat={handleNewChat}
        connectionStatus={connectionStatus}
        statusLabel={statusLabel}
        retryConnection={retryConnection}
        availableModels={availableModels}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isResponding={isResponding}
        isLoadingModels={isLoadingModels}
        hasHeaderModelOptions={hasHeaderModelOptions}
        currentChat={currentChat}
        allChats={chatHistory}
      />
      <main className="chat-wrapper" aria-label="Chat interface">
        <div className="chat-main">
          <Show when={!isNewChat}>
            <ChatWindow messages={messages} isResponding={isResponding} />
          </Show>

            <div className="chat-main__inline-input chat-main__inline-input--home">
              <UserInput
                ref={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                onStop={cancelPendingResponse}
                isResponding={isResponding}
                availableModels={availableModels}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                isLoadingModels={isLoadingModels}
                showModelSelect={false}
              />
            </div>

          <Show when={isNewChat}>
            <section className="home-panels" aria-label="Start and recent chats">
              <div className="home-panels__tabs" role="tablist" aria-label="Start and recent tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeHomeTab === "suggestions"}
                  className={`home-panels__tab ${activeHomeTab === "suggestions" ? "home-panels__tab--active" : ""}`}
                  onClick={() => setActiveHomeTab("suggestions")}
                  id="tab-start"
                  aria-controls="panel-start"
                >
                  Suggestions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeHomeTab === "recent"}
                  className={`home-panels__tab ${activeHomeTab === "recent" ? "home-panels__tab--active" : ""}`}
                  onClick={() => setActiveHomeTab("recent")}
                  id="tab-recent"
                  aria-controls="panel-recent"
                >
                  Recent
                </button>
              </div>
              <div className="home-panels__body">
                {activeHomeTab === "suggestions" ? (
                  <div role="tabpanel" id="panel-start" aria-labelledby="tab-start">
                    <Suggestions
                      suggestions={suggestionItems}
                      classes={["suggestions", "home-panels__suggestions"]}
                    />
                  </div>
                ) : (
                  <section
                    className="recent-panel"
                    role="tabpanel"
                    id="panel-recent"
                    aria-labelledby="tab-recent"
                  >
                    <div className="recent-panel__header">
                      <h2 className="recent-panel__title">Recent chats</h2>
                      <label className="recent-panel__search" htmlFor="recentSearch">
                        <span className="recent-panel__search-icon" aria-hidden="true">
                          🔍
                        </span>
                        <span className="sr-only">Search chats</span>
                        <input
                          id="recentSearch"
                          type="search"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search chats"
                        />
                      </label>
                    </div>
                    <div className="recent-panel__list">
                      <ChatList
                        chats={filteredChats}
                        activeChatId={activeChatId}
                        onSelectChat={handleSelectChat}
                        onRemoveChat={handleRemoveChat}
                      />
                    </div>
                  </section>
                )}
              </div>
            </section>
          </Show>
        </div>

      </main>
    </article>
  );
};

export default App;
