import { Dispatch, SetStateAction, useEffect, useRef } from "react";

import type { ChatSummary, Message } from "../../types";
import { cloneMessages } from "../../utils";

type HydrateActiveChatParams = {
  activeChatId: string | null;
  chatHistory: ChatSummary[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setChatOpen: Dispatch<SetStateAction<boolean>>;
};

const useHydrateActiveChat = ({
  activeChatId,
  chatHistory,
  setMessages,
  setChatOpen,
}: HydrateActiveChatParams) => {
  const hydratedActiveChatRef = useRef(false);

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
};

export default useHydrateActiveChat;
