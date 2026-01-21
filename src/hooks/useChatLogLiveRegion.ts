import { useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "../types";

type LiveRegionMode = "polite" | "off";

type ChatLogLiveRegionOptions = {
  messages: Message[];
  isResponding: boolean;
};

type ChatLogLiveRegionResult = {
  liveMode: LiveRegionMode;
  ariaRelevant: "additions text";
  ariaAtomic: boolean;
};

const getLatestBotMessage = (messages: Message[]) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender === "bot") {
      return messages[i];
    }
  }
  return null;
};

const useChatLogLiveRegion = ({
  messages,
  isResponding,
}: ChatLogLiveRegionOptions): ChatLogLiveRegionResult => {
  const [liveMode, setLiveMode] = useState<LiveRegionMode>("polite");
  const lastAnnouncedContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const latestBotMessage = getLatestBotMessage(messages);
    const latestContent = latestBotMessage?.content ?? "";

    if (!isResponding) {
      lastAnnouncedContentRef.current = latestContent;
      if (
        rafIdRef.current !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(rafIdRef.current);
      }
      setLiveMode("polite");
      return;
    }

    if (
      latestContent === lastAnnouncedContentRef.current ||
      latestContent.length === 0
    ) {
      return;
    }

    lastAnnouncedContentRef.current = latestContent;
    setLiveMode("off");

    if (
      rafIdRef.current !== null &&
      typeof cancelAnimationFrame === "function"
    ) {
      cancelAnimationFrame(rafIdRef.current);
    }

    if (typeof requestAnimationFrame === "function") {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setLiveMode("polite");
      });
    } else {
      setLiveMode("polite");
    }
  }, [isResponding, messages]);

  useEffect(
    () => () => {
      if (
        rafIdRef.current !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(rafIdRef.current);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      liveMode,
      ariaRelevant: "additions text",
      ariaAtomic: false,
    }),
    [liveMode],
  );
};

export default useChatLogLiveRegion;
