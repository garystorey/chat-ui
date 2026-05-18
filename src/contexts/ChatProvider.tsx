import React from "react";
import MessageProvider, { useMessage } from "./MessageContext";
import UserProvider from "./UserContext";
import { ConnectionProvider } from "./ConnectionContext";

// Compose focused providers. `ChatProvider` remains a single entry point for
// backwards compatibility while enabling migration to smaller contexts.
export const ChatProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  return (
    <MessageProvider>
      <UserProvider>
        <ConnectionProvider>{children}</ConnectionProvider>
      </UserProvider>
    </MessageProvider>
  );
};

export const useChat = useMessage;

export default ChatProvider;
