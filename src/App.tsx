import { useAtom } from "jotai";
import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react";
import { messagesAtom, respondingAtom } from "./atoms";
import { ChatHeader, HomePanels, Show, UserInput } from "./components";
import { ChatWindow } from "./features/";

import type {
  ChatSummary,
  ConnectionStatus,
  Message,
  UserInputSendPayload,
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

  const statusLabel = {
    connecting: "Connecting",
    online: "Online",
    offline: "Offline",
  }[connectionStatus];

  const hasHeaderModelOptions = availableModels.length > 0;

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
            <HomePanels
              suggestionItems={suggestionItems}
              chatHistory={chatHistory}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onRemoveChat={handleRemoveChat}
            />
          </Show>
        </div>

      </main>
    </article>
  );
};

export default App;
