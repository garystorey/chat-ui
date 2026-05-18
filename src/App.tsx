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

  return (
    <article className="app">
      <a
        href="#messages"
        className="sr-only skip-link"
        onClick={handleSkipToMessages}
      >
        Skip to conversation
      </a>
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
              sendPayload={{ model: selectedModel }}
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
              onRenameChat={handleRenameChat}
              onImportChats={handleImportChats}
              onToast={showToast}
              currentChat={currentChat}
              allChats={chatHistory}
            />
          </Show>
        </div>
      </main>
    </article>
  );
};

export default App;
