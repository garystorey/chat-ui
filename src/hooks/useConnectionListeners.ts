import { useCallback, useEffect, type SetStateAction } from "react";

import { buildRequest } from "../utils";
import useLatestRef from "./useLatestRef";

export type ConnectionStatus = "online" | "offline";

type UseConnectionListenersProps = {
  setConnectionStatus: (update: SetStateAction<ConnectionStatus>) => void;
  cancelPendingResponse: () => void;
};

const checkApiAvailability = async (signal?: AbortSignal) => {
  try {
    const { url, requestHeaders } = buildRequest({ path: "/v1/models", method: "GET" });
    const response = await fetch(url, { method: "GET", headers: requestHeaders, signal });
    if (response.ok) {
      return true;
    }

    if (response.status >= 400 && response.status < 500) {
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }

    console.error("API availability check failed", error);
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
      const isApiAvailable = await checkApiAvailability(signal);
      setConnectionStatus(isApiAvailable ? "online" : "offline");

      if (isApiAvailable) {
        cancelPendingResponseRef.current();
      }

      return isApiAvailable;
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
