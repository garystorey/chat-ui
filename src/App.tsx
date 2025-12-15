import { useAtom } from "jotai";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { messagesAtom, respondingAtom } from "./atoms";
import { Show, UserInput, Suggestions } from "./components";
import { ChatWindow, Sidebar } from "./features/";
import type { ConnectionStatus } from "./hooks/useConnectionListeners";

import type {
  UserInputSendPayload,
  ChatSummary,
  Message,
  Attachment,
  AttachmentIngestionState,
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
  ingestAttachments,
  toChatCompletionMessages,
} from "./utils";

import { ASSISTANT_ERROR_MESSAGE, DEFAULT_CHAT_MODEL, defaultChats, suggestions } from "./config";

import "./App.css";

const App = () => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [isResponding, setResponding] = useAtom(respondingAtom);
  const [inputValue, setInputValue] = useState("");
  const [isChatOpen, setChatOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>(() =>
    [...defaultChats].sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    "offline"
  );
  const [availableModels, setAvailableModels] = useState<string[]>([
    DEFAULT_CHAT_MODEL,
  ]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [attachmentIngestion, setAttachmentIngestion] = useState<Record<string, AttachmentIngestionState>>({});
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
    async ({ text, attachments }: UserInputSendPayload) => {
      if (!text && attachments.length === 0) {
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

      let messageAttachments: Attachment[] = [];

      if (attachments.length) {
        setAttachmentIngestion({});

        try {
          messageAttachments = await ingestAttachments(attachments, {
            onStatusUpdate: (id, state) =>
              setAttachmentIngestion((current) => ({ ...current, [id]: state })),
          });
        } catch (error) {
          console.error("Unable to ingest attachments", error);
          setAttachmentIngestion((current) => ({
            ...current,
            ...attachments.reduce(
              (acc, attachment) => ({
                ...acc,
                [attachment.id]: current[attachment.id] ?? {
                  status: "error",
                  message: "Unable to process attachment",
                },
              }),
              {}
            ),
          }));
          return false;
        }
      }

      const chatId = activeChatId ?? getId();

      if (!activeChatId) {
        setActiveChatId(chatId);
      }

      const userMessage: Message = {
        id: getId(),
        sender: "user",
        content: text,
        ...(messageAttachments.length
          ? { attachments: messageAttachments }
          : {}),
      };

      const assistantMessageId = getId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        sender: "bot",
        content: "",
      };

      const conversationForRequest = [...messages, userMessage];
      const updateAssistantMessage = (content: string) => {
        setMessages((current) => {
          let previewMessage: Message | undefined;
          const next = current.map((message) => {
            if (message.id === assistantMessageId) {
              const updated = { ...message, content };
              previewMessage = updated;
              return updated;
            }
            return message;
          });

          if (previewMessage) {
            updateActiveChat(next, chatId, previewMessage);
          }

          return next;
        });
      };

      const handleCompletionError = (error: unknown) => {
        console.error("Chat completion request failed", error);

        setMessages((current) => {
          let previewMessage: Message | undefined;
          const next = current.map((message) => {
            if (message.id === assistantMessageId) {
              const updated = { ...message, content: ASSISTANT_ERROR_MESSAGE };
              previewMessage = updated;
              return updated;
            }
            return message;
          });

          if (previewMessage) {
            updateActiveChat(next, chatId, previewMessage);
          }

          return next;
        });
      };

      setMessages((current) => {
        const next = [...current, userMessage, assistantMessage];
        updateActiveChat(next, chatId, userMessage);
        return next;
      });

      setInputValue("");
      setResponding(true);

      const handleFinalAssistantReply = (finalAssistantReply: string) => {
        setMessages((current) => {
          let previewMessage: Message | undefined;
          const next = current.map((message) => {
            if (message.id === assistantMessageId) {
              if (message.content === finalAssistantReply) {
                previewMessage = message;
                return message;
              }
              const updated = { ...message, content: finalAssistantReply };
              previewMessage = updated;
              return updated;
            }
            return message;
          });

          if (previewMessage) {
            updateActiveChat(next, chatId, previewMessage);
          }

          return next;
        });
      };

      sendChatCompletion({
        body: {
          model: selectedModel,
          messages: toChatCompletionMessages(conversationForRequest),
          stream: true,
        },
        chatId,
        assistantMessageId,
        onStreamUpdate: updateAssistantMessage,
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

  const handleNewChat = useCallback(() => {
    cancelPendingResponse();
    archiveCurrentConversation();
    setMessages([]);
    setActiveChatId(null);
    setInputValue("");
    setChatOpen(false);
    setSidebarCollapsed(false);
  }, [
    archiveCurrentConversation,
    cancelPendingResponse,
    setChatOpen,
    setInputValue,
    setMessages,
    setSidebarCollapsed,
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
        setSidebarCollapsed(false);
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
      setSidebarCollapsed,
    ]
  );

  const suggestionsClasses = ["suggestions"];

  if (isChatOpen) {
    suggestionsClasses.push("suggestions--hidden");
  }

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

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, [setSidebarCollapsed]);

  return (
    <article className="app">
      <a href="#messages" className="skip-link" onClick={handleSkipToMessages}>
        Skip to conversation
      </a>
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={handleToggleSidebar}
        chats={chatHistory}
        activeChatId={activeChatId}
        connectionStatus={connectionStatus}
        onRetryConnection={retryConnection}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRemoveChat={handleRemoveChat}
      />
      <main className="chat-wrapper" aria-label="Chat interface">
        <div className="chat-main chat-main__content">
            <Show when={!isNewChat}>
              <ChatWindow
                messages={messages}
                isResponding={isResponding}
              />
            </Show>
              <div className="chat-main__inline-input">
                <UserInput
                  ref={inputRef}
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={handleSend}
                  onStop={cancelPendingResponse}
                  isResponding={isResponding}
                  attachmentStatuses={attachmentIngestion}
                  availableModels={availableModels}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  isLoadingModels={isLoadingModels}
                />
              </div>
            <Show when={isNewChat}>
              <Suggestions
                suggestions={suggestionItems}
                classes={suggestionsClasses}
              />
            </Show>
          </div>
      </main>
    </article>
  );
};

export default App;
