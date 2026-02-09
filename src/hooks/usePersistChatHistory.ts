import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { ChatSummary } from "../types";
import { parseChatPayload } from "../utils";
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

    let storedChatHistory: string | null = null;
    try {
      storedChatHistory = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error("Unable to access stored chat history", error);
      setHasHydrated(true);
      return;
    }

    if (!storedChatHistory) {
      setHasHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedChatHistory) as unknown;
      const normalizedChats = parseChatPayload(parsed);

      if (normalizedChats.length > 0) {
        setChatHistory(normalizedChats);
      } else if (
        (Array.isArray(parsed) && parsed.length === 0) ||
        (typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { chats?: unknown }).chats) &&
          (parsed as { chats?: unknown[] }).chats?.length === 0)
      ) {
        setChatHistory([]);
      }
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
