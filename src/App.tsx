import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ChatWindow,
  ChatHeader,
  ExportButton,
  HomePanels,
  Show,
  UserInput,
} from "./components";

import type {
  ChatSummary,
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ConnectionStatus,
  HomeTab,
  Message,
  MessageToolInvocation,
  UserInputSendPayload,
} from "./types";
import {
  useConnectionListeners,
  useTheme,
  useToggleBodyClass,
  usePersistChatHistory,
  useHydrateActiveChat,
  useChatCompletionStream,
  useToast,
  useChatHeaderLogic,
  useToolOrchestration,
} from "./hooks";
import { useChat } from "./contexts/ChatProvider";
import { useConnection } from "./contexts/ConnectionContext";
import {
  cloneMessages,
  createChatRecordFromMessages,
  buildChatPreview,
  executeLocalToolCalls,
  formatErrorMessage,
  getId,
  LOCAL_CHAT_TOOLS,
  runToolOrchestration,
  sortChatsByUpdatedAt,
  toChatCompletionMessages,
  upsertChatHistoryWithMessages,
} from "./utils";

import {
  ASSISTANT_ERROR_MESSAGE,
  ENABLE_TOOL_CALLS,
  MAX_TOOL_CALL_ROUNDS,
  defaultChats,
  suggestions,
} from "./config";

import "./App.css";

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const areToolInvocationsEqual = (
  left: MessageToolInvocation[] | undefined,
  right: MessageToolInvocation[] | undefined,
) => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);

const App = () => {
  const { messages, setMessages } = useChat();
  const [inputValue, setInputValue] = useState("");
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>(() =>
    sortChatsByUpdatedAt(defaultChats),
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab["id"]>("suggestions");
  const { connectionStatus, setConnectionStatus } = useConnection();
  const {
    availableModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    hasHeaderModelOptions,
    refreshModels,
  } = useChatHeaderLogic();
  const { showToast } = useToast();
  const {
    status: chatCompletionStatus,
    reset: resetChatCompletion,
    send: sendChatCompletion,
    pendingRequestRef,
  } = useChatCompletionStream();
  const { run: runToolOrchestrationHook } = useToolOrchestration();
  const isResponding = chatCompletionStatus === "pending";
  const isNewChat = messages.length === 0;
  const isHistoryOpen = homeTab === "recent";
  const showHomePanels = isNewChat || isHistoryOpen;

  const cancelPendingResponse = useCallback(() => {
    if (pendingRequestRef.current) {
      pendingRequestRef.current.abort();
      pendingRequestRef.current = null;
    }

    resetChatCompletion();
  }, [resetChatCompletion]);

  useTheme();
  useToggleBodyClass("chat-open", isChatOpen);
  usePersistChatHistory(chatHistory, setChatHistory, (error) => {
    showToast({
      type: "warning",
      message: formatErrorMessage(
        error,
        "Unable to save chat history. Changes may not persist.",
      ),
    });
  });
  useHydrateActiveChat({
    activeChatId,
    chatHistory,
    setMessages,
    setChatOpen,
  });
  const retryConnection = useConnectionListeners({ setConnectionStatus });
  const handleRetryConnection = useCallback(() => {
    refreshModels();
    retryConnection();
  }, [retryConnection, refreshModels]);

  // model loading and selection handled by useChatHeaderLogic

  useEffect(() => {
    return () => {
      cancelPendingResponse();
    };
  }, [cancelPendingResponse]);

  const previousConnectionStatusRef = useRef<ConnectionStatus>("connecting");

  useEffect(() => {
    if (
      connectionStatus === "offline" &&
      previousConnectionStatusRef.current !== "offline"
    ) {
      showToast({
        type: "error",
        message: "Unable to connect to the API.",
        duration: 5000,
      });
    }

    previousConnectionStatusRef.current = connectionStatus;
  }, [connectionStatus, showToast]);

  const persistChatHistory = useCallback(
    (
      chatId: string | null,
      nextMessages: Message[],
      previewMessage?: Message,
    ) => {
      if (!chatId) {
        return;
      }

      setChatHistory((current) =>
        upsertChatHistoryWithMessages(
          current,
          chatId,
          nextMessages,
          previewMessage,
        ),
      );
    },
    [setChatHistory],
  );

  const updateAssistantMessageContent = useCallback(
    (
      assistantMessageId: string,
      chatId: string,
      nextContent: string,
      { skipIfUnchanged = false } = {},
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
          persistChatHistory(chatId, next, previewMessage);
        }

        return next;
      });
    },
    [persistChatHistory, setMessages],
  );

  const archiveCurrentConversation = useCallback(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const chatId = activeChatId ?? getId();

    persistChatHistory(chatId, messages, lastMessage);
  }, [activeChatId, messages, persistChatHistory]);

  const updateAssistantToolInvocations = useCallback(
    (
      assistantMessageId: string,
      chatId: string,
      toolInvocations: MessageToolInvocation[],
      { skipIfUnchanged = false } = {},
    ) => {
      setMessages((current) => {
        let previewMessage: Message | undefined;
        const next = current.map((message) => {
          if (message.id !== assistantMessageId) {
            return message;
          }

          if (
            skipIfUnchanged &&
            areToolInvocationsEqual(message.toolInvocations, toolInvocations)
          ) {
            previewMessage = message;
            return message;
          }

          const updated: Message = {
            ...message,
            toolInvocations,
          };
          previewMessage = updated;
          return updated;
        });

        if (previewMessage) {
          persistChatHistory(chatId, next, previewMessage);
        }

        return next;
      });
    },
    [persistChatHistory, setMessages],
  );

  const handleSend = useCallback(
    async ({ text, attachments, model }: UserInputSendPayload) => {
      const trimmedText = text?.trim() ?? "";
      const hasAttachments = (attachments ?? []).length > 0;

      if (!trimmedText && !hasAttachments) {
        return false;
      }

      if (pendingRequestRef.current) {
        return false;
      }

      if (chatCompletionStatus === "error") {
        resetChatCompletion();
      }

      const modelToUse = model?.trim() || selectedModel?.trim();

      if (!modelToUse) {
        showToast({
          type: "warning",
          message: "Select a model before sending a message.",
        });
        return false;
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
        content: trimmedText,
        attachments: attachments?.length ? attachments : undefined,
      };

      const assistantMessageId = getId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        sender: "bot",
        content: "",
      };

      const conversationForRequest = [...messages, userMessage];
      const handleCompletionError = (error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Chat completion request failed", error);
        showToast({
          type: "error",
          message: formatErrorMessage(
            error,
            "Unable to complete the response.",
          ),
        });
        updateAssistantMessageContent(
          assistantMessageId,
          chatId,
          ASSISTANT_ERROR_MESSAGE,
        );
      };

      setMessages((current) => {
        const next = [...current, userMessage, assistantMessage];
        persistChatHistory(chatId, next, userMessage);
        return next;
      });

      setInputValue("");

      const handleFinalAssistantReply = (finalAssistantReply: string) =>
        updateAssistantMessageContent(
          assistantMessageId,
          chatId,
          finalAssistantReply,
          {
            skipIfUnchanged: true,
          },
        );

      if (!ENABLE_TOOL_CALLS) {
        sendChatCompletion({
          body: {
            model: modelToUse,
            messages: toChatCompletionMessages(conversationForRequest),
            stream: true,
          },
          onStreamUpdate: (content) =>
            updateAssistantMessageContent(assistantMessageId, chatId, content),
          onStreamComplete: handleFinalAssistantReply,
          onError: handleCompletionError,
          onSettled: () => {},
        });

        return true;
      }

      try {
        await runToolOrchestrationHook({
          model: modelToUse,
          initialMessages: toChatCompletionMessages(conversationForRequest),
          tools: LOCAL_CHAT_TOOLS,
          maxToolRounds: MAX_TOOL_CALL_ROUNDS,
          sendChatCompletion,
          executeLocalToolCalls,
          onStreamUpdate: (content) =>
            updateAssistantMessageContent(assistantMessageId, chatId, content),
          onStreamComplete: handleFinalAssistantReply,
          applyToolInvocations: (toolInvocations) =>
            updateAssistantToolInvocations(
              assistantMessageId,
              chatId,
              toolInvocations,
            ),
        });
      } catch (error) {
        handleCompletionError(error);
      }

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
      selectedModel,
      updateAssistantMessageContent,
      updateAssistantToolInvocations,
      showToast,
    ],
  );

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSuggestionSelect = useCallback(
    (value: string) => {
      setInputValue(value);
      inputRef.current?.focus();
    },
    [inputRef, setInputValue],
  );

  const suggestionItems = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        ...suggestion,
        handleSelect: () => handleSuggestionSelect(suggestion.prompt),
      })),
    [handleSuggestionSelect],
  );

  const statusLabel = {
    connecting: "Connecting",
    online: "Online",
    offline: "Offline",
  }[connectionStatus];

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

  const resetChatState = useCallback(() => {
    setMessages([]);
    setActiveChatId(null);
    setInputValue("");
    setChatOpen(false);
    setHomeTab("suggestions");
  }, [setActiveChatId, setChatOpen, setInputValue, setMessages]);

  const handleNewChat = useCallback(() => {
    cancelPendingResponse();
    archiveCurrentConversation();
    resetChatState();
  }, [archiveCurrentConversation, cancelPendingResponse, resetChatState]);

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
      setHomeTab("suggestions");
    },
    [
      archiveCurrentConversation,
      cancelPendingResponse,
      chatHistory,
      setChatOpen,
      setInputValue,
      setMessages,
    ],
  );

  const handleRemoveChat = useCallback(
    (chatId: string) => {
      const isRemovingActiveChat = chatId === activeChatId;
      if (chatHistory.length === 0) {
        return;
      }

      const nextChatHistory = chatHistory.filter((chat) => chat.id !== chatId);
      const removalOccurred = nextChatHistory.length !== chatHistory.length;

      if (!removalOccurred) {
        return;
      }

      setChatHistory(nextChatHistory);
      cancelPendingResponse();

      if (isRemovingActiveChat) {
        resetChatState();
      }
    },
    [
      activeChatId,
      cancelPendingResponse,
      chatHistory,
      resetChatState,
      setChatHistory,
    ],
  );

  const handleRenameChat = useCallback(
    (chatId: string, nextTitle: string) => {
      setChatHistory((current) => {
        let didUpdate = false;
        const next = current.map((chat) => {
          if (chat.id !== chatId) {
            return chat;
          }

          didUpdate = true;
          const trimmedTitle = nextTitle.trim();
          if (!trimmedTitle || trimmedTitle === chat.title) {
            return chat;
          }

          const latestMessage = chat.messages[chat.messages.length - 1];
          const preview = buildChatPreview(latestMessage, trimmedTitle);
          return {
            ...chat,
            title: trimmedTitle,
            preview,
          };
        });

        return didUpdate ? next : current;
      });
    },
    [setChatHistory],
  );

  const handleImportChats = useCallback((importedChats: ChatSummary[]) => {
    if (importedChats.length === 0) return;

    setChatHistory((current) => {
      const existingIds = new Set(current.map((chat) => chat.id));
      const newChats = importedChats.filter(
        (chat) => !existingIds.has(chat.id),
      );

      if (newChats.length === 0) {
        return current;
      }

      return sortChatsByUpdatedAt([...newChats, ...current]);
    });
  }, []);

  const handleSkipToMessages = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById("messages");
      if (target instanceof HTMLElement) {
        target.focus();
      }
    },
    [],
  );

  const handleShowChats = useCallback(() => {
    setHomeTab("suggestions");
  }, []);

  const handleShowHistory = useCallback(() => {
    setHomeTab("recent");
    setChatOpen(false);
  }, [setChatOpen]);

  return (
    <article className="app">
      <a
        href="#messages"
        className="sr-only skip-link"
        onClick={handleSkipToMessages}
      >
        Skip to conversation
      </a>
      <aside className="app__rail" aria-label="Primary navigation">
        <div className="app__rail-brand" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <path d="M8 10.5A4.5 4.5 0 0 1 12.5 6h8A4.5 4.5 0 0 1 25 10.5v5A4.5 4.5 0 0 1 20.5 20H16l-5 4v-4.1A4.5 4.5 0 0 1 8 15.5v-5Z" />
            <path d="M6 14v4.5A4.5 4.5 0 0 0 10.5 23H15" />
          </svg>
        </div>
        <div className="app__rail-nav">
          <button
            type="button"
            className={`app__rail-link ${
              !isHistoryOpen ? "app__rail-link--active" : ""
            }`}
            onClick={handleShowChats}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H12l-4 3v-3A3.5 3.5 0 0 1 5 10.5v-4Z" />
              <path d="M4 12v1.5A3.5 3.5 0 0 0 7.5 17H12" />
            </svg>
            <span>Chats</span>
          </button>
          <button
            type="button"
            className={`app__rail-link ${
              isHistoryOpen ? "app__rail-link--active" : ""
            }`}
            onClick={handleShowHistory}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>History</span>
          </button>
        </div>
      </aside>
      <nav className="app__mobile-nav" aria-label="Primary navigation">
        <button
          type="button"
          className={`app__mobile-nav-link ${
            !isHistoryOpen ? "app__mobile-nav-link--active" : ""
          }`}
          onClick={handleShowChats}
        >
          Chats
        </button>
        <button
          type="button"
          className={`app__mobile-nav-link ${
            isHistoryOpen ? "app__mobile-nav-link--active" : ""
          }`}
          onClick={handleShowHistory}
        >
          History
        </button>
      </nav>
      <ChatHeader
        handleNewChat={handleNewChat}
        onRetryConnection={handleRetryConnection}
        availableModels={availableModels}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        isResponding={isResponding}
        isLoadingModels={isLoadingModels}
        hasHeaderModelOptions={hasHeaderModelOptions}
      />
      <main className="chat-wrapper" aria-label="Chat interface">
        <div className="chat-main">
          <Show when={!showHomePanels}>
            <div className="chat-main__actions">
              <ExportButton currentChat={currentChat} allChats={chatHistory} />
            </div>
          </Show>
          <Show when={!showHomePanels}>
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
              sendPayload={{ model: selectedModel }}
              onToast={showToast}
            />
          </div>

          <Show when={showHomePanels}>
            <HomePanels
              suggestionItems={suggestionItems}
              chatHistory={chatHistory}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onRemoveChat={handleRemoveChat}
              onRenameChat={handleRenameChat}
              onImportChats={handleImportChats}
              onToast={showToast}
              currentChat={currentChat}
              allChats={chatHistory}
              activeTab={homeTab}
            />
          </Show>
        </div>
      </main>
    </article>
  );
};

export default App;
