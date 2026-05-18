import type { ChatHistoryAdapter } from "../chatHistory";

export type EnvironmentAdapter = {
  isBrowser: () => boolean;
  getStorageAdapter: () => ChatHistoryAdapter | undefined;
};

export const defaultEnvironmentAdapter: EnvironmentAdapter = {
  isBrowser: () => typeof window !== "undefined",
  getStorageAdapter: () => {
    if (typeof window === "undefined") return undefined;

    return {
      getItem: (k: string) => window.localStorage.getItem(k),
      setItem: (k: string, v: string) => window.localStorage.setItem(k, v),
      removeItem: (k: string) => window.localStorage.removeItem(k),
    } as ChatHistoryAdapter;
  },
};

export default defaultEnvironmentAdapter;
