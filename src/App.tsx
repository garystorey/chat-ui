import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { messagesAtom } from "./atoms";
import { ChatHeader, ExportButton, HomePanels, Show, ToastStack, UserInput } from "./components";
import { ChatWindow } from "./features/";

import type {
  ChatSummary,
  ConnectionStatus,
  Message,
  UserInputSendPayload,
} from "./types";
import type { ToastItem, ToastType } from "./components/Toast";
import {
  useConnectionListeners,
  useTheme,
  useToggleBodyClass,
  usePersistChatHistory,
  useHydrateActiveChat,
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

import { ASSISTANT_ERROR_MESSAGE, defaultChats, suggestions } from "./config";

import "./App.css";

const sortChatsByUpdatedAt = (chats: ChatSummary[]) =>
  [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

const upsertChatHistory = (
  current: ChatSummary[],
  updatedChat: ChatSummary,
  exists: boolean
) =>
  exists
    ? current.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
    : [updatedChat, ...current];

const App = () => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [inputValue, setInputValue] = useState("");
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>(() =>
    sortChatsByUpdatedAt(defaultChats)
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    "connecting"
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsRefreshKey, setModelsRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const {
    status: chatCompletionStatus,
    reset: resetChatCompletion,
    send: sendChatCompletion,
    pendingRequestRef,
  } = useChatCompletionStream();
  const isResponding = chatCompletionStatus === "pending";
  const isNewChat = messages.length === 0;

  const cancelPendingResponse = useCallback(() => {
    if (pendingRequestRef.current) {
      pendingRequestRef.current.abort();
      pendingRequestRef.current = null;
    }

    if (chatCompletionStatus !== "idle") {
      resetChatCompletion();
    }

  }, [chatCompletionStatus, resetChatCompletion]);

  const toastTimeoutsRef = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeout = toastTimeoutsRef.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      toastTimeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ type, message, duration = 4000 }: { type: ToastType; message: string; duration?: number }) => {
      const id = getId();
      setToasts((current) => [...current, { id, type, message }]);

      if (duration > 0) {
        const timeout = window.setTimeout(() => {
          dismissToast(id);
        }, duration);
        toastTimeoutsRef.current.set(id, timeout);
      }
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
      toastTimeoutsRef.current.clear();
    };
  }, []);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }

    return fallback;
  }, []);

  useTheme();
  useToggleBodyClass("chat-open", isChatOpen);
  usePersistChatHistory(chatHistory, setChatHistory);
  useHydrateActiveChat({
    activeChatId,
    chatHistory,
    setMessages,
    setChatOpen,
  });
  const retryConnection = useConnectionListeners({
    setConnectionStatus,
  });
  const handleRetryConnection = useCallback(() => {
    setModelsRefreshKey((current) => current + 1);
    retryConnection();
  }, [retryConnection]);

  useAvailableModels({
    connectionStatus,
    refreshKey: modelsRefreshKey,
    setAvailableModels,
    setSelectedModel,
    setIsLoadingModels,
    onError: (error) => {
      showToast({
        type: "warning",
        message: getErrorMessage(error, "Unable to load models."),
      });
    },
  });

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

        const nextHistory = upsertChatHistory(current, updatedChat, Boolean(existingChat));

        return sortChatsByUpdatedAt(nextHistory);
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
        sortChatsByUpdatedAt(
          current.map((chat) =>
            chat.id === activeChatId
              ? {
                  ...chat,
                  preview: buildChatPreview(lastMessage, chat.preview),
                  updatedAt: Date.now(),
                  messages: cloneMessages(messages),
                }
              : chat
          )
        )
      );
      return;
    }

    const newChat = createChatRecordFromMessages(messages);
    setChatHistory((current) => sortChatsByUpdatedAt([newChat, ...current]));
  }, [activeChatId, messages]);

  const handleSend = useCallback(
    async ({ text, model }: UserInputSendPayload) => {
      if (!text) {
        return false;
      }

      if (!selectedModel) {
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
        showToast({
          type: "error",
          message: getErrorMessage(error, "Unable to complete the response."),
        });
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

      const handleFinalAssistantReply = (finalAssistantReply: string) =>
        updateAssistantMessageContent(assistantMessageId, chatId, finalAssistantReply, {
          skipIfUnchanged: true,
        });

      const modelToUse =
        model?.trim() || selectedModel?.trim() || DEFAULT_CHAT_MODEL;

      if (!modelToUse) {
        showToast({
          type: "warning",
          message: "Select a model before sending a message.",
        });
        return false;
      }

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
      updateActiveChat,
      updateAssistantMessageContent,
      getErrorMessage,
      showToast,
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

  const handleImportChats = useCallback(
    (importedChats: ChatSummary[]) => {
      if (importedChats.length === 0) return;

      setChatHistory((current) => {
        const existingIds = new Set(current.map((chat) => chat.id));
        const newChats = importedChats.filter((chat) => !existingIds.has(chat.id));

        if (newChats.length === 0) {
          return current;
        }

        return sortChatsByUpdatedAt([...newChats, ...current]);
      });
    },
    []
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
        retryConnection={handleRetryConnection}
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
            <div className="chat-main__actions">
              <ExportButton currentChat={currentChat} allChats={chatHistory} />
            </div>
          </Show>
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
                onToast={showToast}
              />
            </div>

          <Show when={isNewChat}>
            <HomePanels
              suggestionItems={suggestionItems}
              chatHistory={chatHistory}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onRemoveChat={handleRemoveChat}
              onImportChats={handleImportChats}
              onToast={showToast}
              currentChat={currentChat}
              allChats={chatHistory}
            />
          </Show>
        </div>

      </main>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </article>
  );
};

export default App;
