import { useCallback, useEffect, type SetStateAction } from "react";

import { API_BASE_URL } from "../config";
import useLatestRef from "./useLatestRef";

export type ConnectionStatus = "online" | "offline" | "connecting";

const logConnectionError = (message: string, error?: unknown) => {
  if (error) {
    console.error(`[Connection] ${message}`, error);
    return;
  }

  console.error(`[Connection] ${message}`);
};

type UseConnectionListenersProps = {
  setConnectionStatus: (update: SetStateAction<ConnectionStatus>) => void;
  cancelPendingResponse: () => void;
};

const checkApiAvailability = async (signal?: AbortSignal) => {
  try {
    const response = await fetch(API_BASE_URL, { method: "HEAD", signal });
    if (response.ok) {
      return true;
    }

    if (response.status >= 400 && response.status < 600) {
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }

    logConnectionError("API availability check failed.", error);
    return false;
  }
};

const useConnectionListeners = ({
  setConnectionStatus,
  cancelPendingResponse,
}: UseConnectionListenersProps) => {
  const cancelPendingResponseRef = useLatestRef(cancelPendingResponse);

  const updateStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setConnectionStatus("connecting");

        const isApiAvailable = await checkApiAvailability(signal);
        const nextStatus: ConnectionStatus = isApiAvailable ? "online" : "offline";

        setConnectionStatus(nextStatus);

        if (isApiAvailable) {
          cancelPendingResponseRef.current();
        } else if (!signal?.aborted) {
          logConnectionError("Unable to connect to API.");
        }

        return isApiAvailable;
      } catch (error) {
        if (signal?.aborted) {
          return false;
        }

        logConnectionError("Unexpected error while updating connection status.", error);
        setConnectionStatus("offline");
        return false;
      }
    },
    [cancelPendingResponseRef, setConnectionStatus]
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
