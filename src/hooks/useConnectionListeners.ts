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

const useConnectionListeners = ({
  setConnectionStatus,
  cancelPendingResponse,
}: UseConnectionListenersProps) => {
  const cancelPendingResponseRef = useLatestRef(cancelPendingResponse);

  const updateStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setConnectionStatus("connecting");

        const response = await fetch(API_BASE_URL, { method: "HEAD", signal });
        const isApiAvailable =
          response.ok || (response.status >= 400 && response.status < 600);
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

        if (error instanceof DOMException && error.name === "AbortError") {
          return false;
        }

        logConnectionError("Unable to connect to API.", error);
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
