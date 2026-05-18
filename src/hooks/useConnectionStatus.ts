import { useMemo } from "react";
import useConnectionListeners from "./useConnectionListeners";
import { useConnection } from "../contexts/ConnectionContext";

export default function useConnectionStatus() {
  const { connectionStatus, setConnectionStatus } = useConnection();
  const retryConnection = useConnectionListeners({ setConnectionStatus });

  const statusLabel = useMemo(() => {
    return {
      connecting: "Connecting",
      online: "Online",
      offline: "Offline",
    }[connectionStatus];
  }, [connectionStatus]);

  return { connectionStatus, statusLabel, retryConnection } as const;
}
