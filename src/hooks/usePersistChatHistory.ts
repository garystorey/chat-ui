import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { ChatSummary } from "../types";
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

    const storedChatHistory = window.localStorage.getItem(
      CHAT_HISTORY_STORAGE_KEY,
    );

    if (!storedChatHistory) {
      setHasHydrated(true);
      return;
    }

    try {
      const parsedChatHistory = JSON.parse(storedChatHistory) as ChatSummary[];
      setChatHistory(parsedChatHistory);
    } catch (error) {
      console.error("Unable to parse stored chat history", error);
    }

    setHasHydrated(true);
  }, [setChatHistory]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify(chatHistory),
      );
    } catch (error) {
      console.error("Unable to persist chat history to local storage.", error);
      onPersistErrorRef.current?.(error);
    }
  }, [chatHistory, hasHydrated]);
};

export default usePersistChatHistory;
