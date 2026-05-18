import type { ChatSummary } from "../types";
import { parseChatPayload } from "../utils/chat";
import type { EnvironmentAdapter } from "./adapters/environmentAdapter";
import { defaultEnvironmentAdapter } from "./adapters/environmentAdapter";

export type ChatHistoryAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

export const CHAT_HISTORY_STORAGE_KEY = "chatHistory";

export const createChatHistoryService = (
  adapter?: ChatHistoryAdapter,
  envAdapter: EnvironmentAdapter = defaultEnvironmentAdapter,
) => {
  const impl: ChatHistoryAdapter | undefined =
    adapter ?? envAdapter.getStorageAdapter();

  const load = (): ChatSummary[] => {
    if (!impl) return [];

    try {
      const raw = impl.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parseChatPayload(parsed);
    } catch (error) {
      // Keep console warnings here to aid debugging when app runs in browser
      // but don't throw — callers should handle failure gracefully.
      // eslint-disable-next-line no-console
      console.error("ChatHistoryService: failed to load chat history", error);
      return [];
    }
  };

  const save = (chats: ChatSummary[]) => {
    if (!impl) return;

    try {
      impl.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("ChatHistoryService: failed to save chat history", error);
      throw error;
    }
  };

  const clear = () => {
    if (!impl) return;
    try {
      impl.removeItem?.(CHAT_HISTORY_STORAGE_KEY);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("ChatHistoryService: failed to clear chat history", error);
    }
  };

  return { load, save, clear };
};

// Default export: service wired with environment-aware adapter when available.
export default createChatHistoryService(undefined, defaultEnvironmentAdapter);
