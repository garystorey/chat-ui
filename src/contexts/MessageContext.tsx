import React, {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAtom } from "jotai";
import { messagesAtom } from "../atoms";
import type { Message } from "../types";

type MessageContextValue = {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  replaceMessages: (next: Message[]) => void;
};

const MessageContext = createContext<MessageContextValue | null>(null);

export const MessageProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [messages, setMessages] = useAtom<Message[]>(messagesAtom);

  const addMessage = (msg: Message) => {
    setMessages((current) => [...current, msg]);
  };

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((current) =>
      current.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const removeMessage = (id: string) => {
    setMessages((current) => current.filter((m) => m.id !== id));
  };

  const replaceMessages = (next: Message[]) => {
    setMessages(next);
  };

  return (
    <MessageContext.Provider
      value={{
        messages,
        setMessages,
        addMessage,
        updateMessage,
        removeMessage,
        replaceMessages,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = (): MessageContextValue => {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return ctx;
};

export default MessageProvider;
