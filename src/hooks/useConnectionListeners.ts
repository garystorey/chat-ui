import { useCallback, useEffect, type SetStateAction } from "react";

import { API_BASE_URL } from "../config";
import { ConnectionStatus } from "../types";

const logConnectionError = (message: string, error?: unknown) => {
  const reason =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;
  const logMessage = reason
    ? `[Connection] ${message} (reason: ${reason})`
    : `[Connection] ${message}`;

  console.info(logMessage);
};

type UseConnectionListenersProps = {
  setConnectionStatus: (update: SetStateAction<ConnectionStatus>) => void;
};

const useConnectionListeners = ({
  setConnectionStatus,
}: UseConnectionListenersProps) => {
  const updateStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setConnectionStatus("connecting");

        const response = await fetch(API_BASE_URL, { method: "HEAD", signal });
        const isApiAvailable =
          response.ok || (response.status >= 400 && response.status < 600);
        const nextStatus: ConnectionStatus = isApiAvailable ? "online" : "offline";

        setConnectionStatus(nextStatus);

        if (!isApiAvailable && !signal?.aborted) {
          logConnectionError("Unable to connect to API.");
        }

        return isApiAvailable;
      } catch (error) {
        if (signal?.aborted) {
          return false;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }

        logConnectionError("Unable to connect to API.", error);
        setConnectionStatus("offline");
        return false;
      }
    },
    [setConnectionStatus]
  );

  useEffect(() => {
    const abortController = new AbortController();

    updateStatus(abortController.signal).catch(() => {
      /* handled in updateStatus */
    });

    const handleOnline = () => {
      updateStatus(abortController.signal).catch(() => {
        /* handled in updateStatus */
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateStatus(abortController.signal).catch(() => {
          /* handled in updateStatus */
        });
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      abortController.abort();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updateStatus]);

  return useCallback(() => updateStatus(), [updateStatus]);
};

export default useConnectionListeners;
