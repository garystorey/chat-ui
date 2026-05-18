import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { ChatSummary } from "../types";
import chatHistoryService from "../services/chatHistory";
import useLatestRef from "./useLatestRef";

const CHAT_HISTORY_STORAGE_KEY = "chatHistory";

const usePersistChatHistory = (
  chatHistory: ChatSummary[],
  setChatHistory: Dispatch<SetStateAction<ChatSummary[]>>,
  onPersistError?: (error: unknown) => void,
) => {
  const [hasHydrated, setHasHydrated] = useState(false);
  const onPersistErrorRef = useLatestRef(onPersistError);

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasHydrated(true);
      return;
    }

    try {
      const normalizedChats = chatHistoryService.load();
      if (normalizedChats.length > 0) {
        setChatHistory(normalizedChats);
      } else {
        setChatHistory((current) => (current.length ? current : []));
      }
    } catch (error) {
      // load() swallows parsing errors and returns [], but keep a defensive catch
      // eslint-disable-next-line no-console
      console.error("Unable to hydrate chat history", error);
    }

    setHasHydrated(true);
  }, [setChatHistory]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydrated) {
      return;
    }

    try {
      chatHistoryService.save(chatHistory);
    } catch (error) {
      onPersistErrorRef.current?.(error);
    }
  }, [chatHistory, hasHydrated]);
};

export default usePersistChatHistory;
