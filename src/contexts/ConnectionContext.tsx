import React, {
  createContext,
  useContext,
  useState,
  type SetStateAction,
} from "react";
import type { ConnectionStatus } from "../types";

type ConnectionContextValue = {
  connectionStatus: ConnectionStatus;
  setConnectionStatus: React.Dispatch<SetStateAction<ConnectionStatus>>;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export const ConnectionProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  return (
    <ConnectionContext.Provider
      value={{ connectionStatus, setConnectionStatus }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }
  return ctx;
};

export default ConnectionProvider;
