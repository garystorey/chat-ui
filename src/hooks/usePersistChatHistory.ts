import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { ChatSummary } from "../types";

const CHAT_HISTORY_STORAGE_KEY = "chatHistory";

const usePersistChatHistory = (
  chatHistory: ChatSummary[],
  setChatHistory: Dispatch<SetStateAction<ChatSummary[]>>,
) => {
  const [hasHydrated, setHasHydrated] = useState(false);

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

    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(chatHistory),
    );
  }, [chatHistory, hasHydrated]);
};

export default usePersistChatHistory;
