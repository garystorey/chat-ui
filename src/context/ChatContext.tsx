import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAtom } from "jotai";
import { useMutation } from "@tanstack/react-query";
import type { ConnectionStatus, ChatSummary, Message, UserInputSendPayload } from "../types";
import {
  useLatestRef,
  useTheme,
  useToggleBodyClass,
  useUnmount,
} from "../hooks";
import {
  API_BASE_URL,
  ASSISTANT_ERROR_MESSAGE,
  CHAT_COMPLETION_PATH,
  DEFAULT_CHAT_MODEL,
  defaultChats,
} from "../config";
import { messagesAtom, respondingAtom } from "../atoms";
import {
  ApiError,
  apiStreamRequest,
  buildChatPreview,
  buildChatCompletionResponse,
  buildRequest,
  cloneMessages,
  createChatRecordFromMessages,
  extractAssistantReply,
  getId,
  isJsonLike,
  parseJson,
  getChatCompletionContentText,
  toChatCompletionMessages,
} from "../utils";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamResponse,
} from "../types";

type ChatContextValue = {
  messages: Message[];
  isResponding: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  isChatOpen: boolean;
  isNewChat: boolean;
  chatHistory: ChatSummary[];
  activeChatId: string | null;
  connectionStatus: ConnectionStatus;
  retryConnection: () => void;
  availableModels: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isLoadingModels: boolean;
  hasHeaderModelOptions: boolean;
  currentChat: ChatSummary | null;
  handleSend: (payload: UserInputSendPayload) => Promise<boolean> | boolean;
  cancelPendingResponse: () => void;
  handleNewChat: () => void;
  handleSelectChat: (chatId: string) => void;
  handleRemoveChat: (chatId: string) => void;
  handleImportChats: (chats: ChatSummary[]) => void;
  statusLabel: string;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const ChatProvider = ({ children }: { children: React.ReactNode }) => {
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
  const pendingRequestRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef("");
  const streamFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hydratedActiveChatRef = useRef(false);
  const hasHydratedHistoryRef = useRef(false);

  const {
    mutate: sendChatCompletion,
    reset: resetChatCompletion,
    status: chatCompletionStatus,
  } = useMutation<
    ChatCompletionResponse,
    ApiError,
    {
      body: ChatCompletionRequest;
      signal?: AbortSignal;
      onChunk?: (chunk: ChatCompletionStreamResponse) => void;
    }
  >({
    mutationFn: async ({ body, signal, onChunk }) =>
      apiStreamRequest<ChatCompletionStreamResponse, ChatCompletionResponse>({
        path: CHAT_COMPLETION_PATH,
        method: "POST",
        body,
        signal,
        onMessage: onChunk,
        buildResponse: buildChatCompletionResponse,
      }),
  });
  const sendChatCompletionStream = useCallback(
    ({
      body,
      onStreamUpdate,
      onStreamComplete,
      onError,
      onSettled,
    }: {
      body: ChatCompletionRequest;
      onStreamUpdate: (content: string) => void;
      onStreamComplete: (content: string) => void;
      onError: (error: unknown) => void;
      onSettled: () => void;
    }) => {
      let assistantReply = "";

      const flushStreamBuffer = () => {
        if (!streamBufferRef.current) {
          return;
        }

        assistantReply += streamBufferRef.current;
        streamBufferRef.current = "";
        onStreamUpdate(assistantReply);
      };

      const scheduleStreamFlush = () => {
        if (streamFlushTimeoutRef.current) {
          return;
        }

        streamFlushTimeoutRef.current = window.setTimeout(() => {
          streamFlushTimeoutRef.current = null;
          flushStreamBuffer();
        }, 100);
      };

      const controller = new AbortController();
      pendingRequestRef.current = controller;

      sendChatCompletion(
        {
          body,
          signal: controller.signal,
          onChunk: (chunk: ChatCompletionStreamResponse) => {
            const contentDelta = chunk?.choices?.reduce((acc, choice) => {
              if (choice.delta?.content) {
                const deltaText = getChatCompletionContentText(choice.delta.content);
                if (deltaText) {
                  return acc + deltaText;
                }
              }
              return acc;
            }, "");

            if (!contentDelta) {
              return;
            }

            streamBufferRef.current += contentDelta;
            scheduleStreamFlush();
          },
        },
        {
          onSuccess: (response: ChatCompletionResponse) => {
            if (streamFlushTimeoutRef.current) {
              clearTimeout(streamFlushTimeoutRef.current);
              streamFlushTimeoutRef.current = null;
            }

            flushStreamBuffer();

            const finalAssistantReply = extractAssistantReply(response);
            if (!finalAssistantReply) {
              return;
            }

            assistantReply = finalAssistantReply;
            onStreamComplete(finalAssistantReply);
          },
          onError: (error: unknown) => {
            if (streamFlushTimeoutRef.current) {
              clearTimeout(streamFlushTimeoutRef.current);
              streamFlushTimeoutRef.current = null;
            }

            streamBufferRef.current = "";

            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            onError(error);
          },
          onSettled: () => {
            if (pendingRequestRef.current === controller) {
              pendingRequestRef.current = null;
            }

            if (streamFlushTimeoutRef.current) {
              clearTimeout(streamFlushTimeoutRef.current);
              streamFlushTimeoutRef.current = null;
            }

            streamBufferRef.current = "";
            onSettled();
          },
        }
      );
    },
    [sendChatCompletion]
  );
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
  useEffect(() => {
    setResponding(chatCompletionStatus === "pending");
  }, [chatCompletionStatus, setResponding]);

  useEffect(() => {
    if (hydratedActiveChatRef.current || !activeChatId) {
      return;
    }

    const storedChat = chatHistory.find((chat) => chat.id === activeChatId);

    if (!storedChat) {
      return;
    }

    hydratedActiveChatRef.current = true;
    setMessages(cloneMessages(storedChat.messages));
    setChatOpen(true);
  }, [activeChatId, chatHistory, setChatOpen, setMessages]);

  useEffect(() => {
    const CHAT_HISTORY_STORAGE_KEY = "chatHistory";

    if (hasHydratedHistoryRef.current || typeof window === "undefined") {
      return;
    }

    const storedChatHistory = window.localStorage.getItem(
      CHAT_HISTORY_STORAGE_KEY
    );

    if (storedChatHistory) {
      try {
        const parsedChatHistory = JSON.parse(storedChatHistory) as ChatSummary[];
        setChatHistory(parsedChatHistory);
      } catch (error) {
        console.error("Unable to parse stored chat history", error);
      }
    }

    hasHydratedHistoryRef.current = true;
  }, [hasHydratedHistoryRef, setChatHistory]);

  useEffect(() => {
    const CHAT_HISTORY_STORAGE_KEY = "chatHistory";
    if (!hasHydratedHistoryRef.current || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(chatHistory)
    );
  }, [chatHistory]);

  const cancelPendingResponseRef = useLatestRef(cancelPendingResponse);
  const updateConnectionStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setConnectionStatus("connecting");

        const response = await fetch(API_BASE_URL, { method: "HEAD", signal });
        const isApiAvailable =
          response.ok || (response.status >= 400 && response.status < 600);
        const nextStatus: ConnectionStatus = isApiAvailable
          ? "online"
          : "offline";

        setConnectionStatus(nextStatus);

        if (isApiAvailable) {
          cancelPendingResponseRef.current();
        } else if (!signal?.aborted) {
          console.info("[Connection] Unable to connect to API.");
        }

        return isApiAvailable;
      } catch (error) {
        if (signal?.aborted) {
          return false;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }

        const reason =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : null;
        const logMessage = reason
          ? `[Connection] Unable to connect to API. (reason: ${reason})`
          : `[Connection] Unable to connect to API.`;
        console.info(logMessage);
        setConnectionStatus("offline");
        return false;
      }
    },
    [API_BASE_URL, cancelPendingResponseRef, setConnectionStatus]
  );
  const retryConnection = useCallback(() => updateConnectionStatus(), [updateConnectionStatus]);

  useEffect(() => {
    const abortController = new AbortController();

    updateConnectionStatus(abortController.signal).catch(() => {
      /* handled in retryConnection */
    });

    const handleOnline = () => {
      updateConnectionStatus(abortController.signal).catch(() => {
        /* handled in retryConnection */
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateConnectionStatus(abortController.signal).catch(() => {
          /* handled in retryConnection */
        });
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortController.abort();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateConnectionStatus]);

  useEffect(() => {
    if (connectionStatus !== "online") {
      return undefined;
    }

    const abortController = new AbortController();
    let cancelled = false;

    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const { url, requestHeaders } = buildRequest({ path: "/v1/models" });
        const response = await fetch(url, {
          method: "GET",
          headers: requestHeaders,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load models (${response.status})`);
        }

        const data = await parseJson(response);

        if (cancelled || !isJsonLike(data)) {
          return;
        }

        const models = Array.isArray((data as { data?: unknown }).data)
          ? ((data as { data: Array<{ id?: unknown }> }).data
              .map((model) => model?.id)
              .filter((id): id is string => typeof id === "string"))
          : [];

        if (!models.length) {
          setAvailableModels([]);
          setSelectedModel(DEFAULT_CHAT_MODEL);
        } else {
          const uniqueModels = Array.from(new Set(models));

          setAvailableModels(uniqueModels);
          setSelectedModel((current) => {
            if (uniqueModels.includes(current)) {
              return current;
            }

            if (uniqueModels.includes(DEFAULT_CHAT_MODEL)) {
              return DEFAULT_CHAT_MODEL;
            }

            return uniqueModels[0];
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch models", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void fetchModels();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [connectionStatus, setAvailableModels, setIsLoadingModels, setSelectedModel]);

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
      if (!text || pendingRequestRef.current) {
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

      setMessages((current) => {
        const next = [...current, userMessage, assistantMessage];
        updateActiveChat(next, chatId, userMessage);
        return next;
      });

      setInputValue("");
      setResponding(true);

      const handleCompletionError = (error: unknown) => {
        console.error("Chat completion request failed", error);
        updateAssistantMessageContent(
          assistantMessageId,
          chatId,
          ASSISTANT_ERROR_MESSAGE
        );
      };

      const handleFinalAssistantReply = (finalAssistantReply: string) =>
        updateAssistantMessageContent(assistantMessageId, chatId, finalAssistantReply, {
          skipIfUnchanged: true,
        });

      sendChatCompletionStream({
        body: {
          model: selectedModel,
          messages: toChatCompletionMessages(conversationForRequest),
          stream: true,
        },
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
      sendChatCompletionStream,
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

  const handleImportChats = useCallback((importedChats: ChatSummary[]) => {
    if (importedChats.length === 0) return;

    setChatHistory((current) => {
      const existingIds = new Set(current.map((chat) => chat.id));
      const newChats = importedChats.filter((chat) => !existingIds.has(chat.id));

      if (newChats.length === 0) {
        return current;
      }

      return [...newChats, ...current].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

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

  const hasHeaderModelOptions = availableModels.length > 0;
  const statusLabel = useMemo(
    () => ({
      connecting: "Connecting",
      online: "Online",
      offline: "Offline",
    }[connectionStatus]),
    [connectionStatus]
  );

  const contextValue = useMemo(
    () => ({
      messages,
      isResponding,
      inputValue,
      setInputValue,
      isChatOpen,
      isNewChat,
      chatHistory,
      activeChatId,
      connectionStatus,
      retryConnection,
      availableModels,
      selectedModel,
      setSelectedModel,
      isLoadingModels,
      hasHeaderModelOptions,
      currentChat,
      handleSend,
      cancelPendingResponse,
      handleNewChat,
      handleSelectChat,
      handleRemoveChat,
      handleImportChats,
      statusLabel,
    }),
    [
      messages,
      isResponding,
      inputValue,
      isChatOpen,
      isNewChat,
      chatHistory,
      activeChatId,
      connectionStatus,
      retryConnection,
      availableModels,
      selectedModel,
      isLoadingModels,
      hasHeaderModelOptions,
      currentChat,
      handleSend,
      cancelPendingResponse,
      handleNewChat,
      handleSelectChat,
      handleRemoveChat,
      handleImportChats,
      statusLabel,
    ]
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }

  return context;
};

export { ChatProvider, useChat };
