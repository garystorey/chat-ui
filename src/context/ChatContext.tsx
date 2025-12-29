import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAtom } from "jotai";
import type { ConnectionStatus, ChatSummary, Message, UserInputSendPayload } from "../types";
import {
  useAvailableModels,
  useChatCompletionStream,
  useConnectionListeners,
  useHydrateActiveChat,
  usePersistChatHistory,
  useRespondingStatus,
  useTheme,
  useToggleBodyClass,
  useUnmount,
} from "../hooks";
import {
  ASSISTANT_ERROR_MESSAGE,
  DEFAULT_CHAT_MODEL,
  defaultChats,
} from "../config";
import { messagesAtom, respondingAtom } from "../atoms";
import {
  buildChatPreview,
  cloneMessages,
  createChatRecordFromMessages,
  getId,
  toChatCompletionMessages,
} from "../utils";

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

      sendChatCompletion({
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
