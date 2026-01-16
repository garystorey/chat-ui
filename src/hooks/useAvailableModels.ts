import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { DEFAULT_CHAT_MODEL } from "../config";
import { buildRequest, isJsonLike, parseJson } from "../utils";
import type { ConnectionStatus } from "../types";
import useLatestRef from "./useLatestRef";

const useAvailableModels = ({
  connectionStatus,
  refreshKey,
  setAvailableModels,
  setSelectedModel,
  setIsLoadingModels,
  onError,
}: {
  connectionStatus: ConnectionStatus;
  refreshKey: number;
  setAvailableModels: Dispatch<SetStateAction<string[]>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setIsLoadingModels: Dispatch<SetStateAction<boolean>>;
  onError?: (error: unknown) => void;
}) => {
  const onErrorRef = useLatestRef(onError);
  const hasFetchedRef = useRef(false);
  const refreshKeyRef = useRef<number | null>(null);

  useEffect(() => {
    if (connectionStatus !== "online") {
      return undefined;
    }

    const shouldRefresh = refreshKeyRef.current !== refreshKey;

    if (hasFetchedRef.current && !shouldRefresh) {
      return undefined;
    }

    refreshKeyRef.current = refreshKey;

    const abortController = new AbortController();
    let cancelled = false;

    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const { url, requestHeaders } = buildRequest({ path: "/v1/models" });
        const response = await fetch(url, {
          method: "GET",
          headers: requestHeaders,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load models (${response.status})`);
        }

        const data = await parseJson(response);

        if (cancelled || !isJsonLike(data)) {
          return;
        }

        const models = Array.isArray((data as { data?: unknown }).data)
          ? ((data as { data: Array<{ id?: unknown }> }).data
              .map((model) => model?.id)
              .filter((id): id is string => typeof id === "string"))
          : [];

        if (!models.length) {
          setAvailableModels([]);
          setSelectedModel(DEFAULT_CHAT_MODEL);
        } else {
          const uniqueModels = Array.from(new Set(models));

          setAvailableModels(uniqueModels);
          setSelectedModel((current) => {
            if (uniqueModels.includes(current)) {
              return current;
            }

            if (uniqueModels.includes(DEFAULT_CHAT_MODEL)) {
              return DEFAULT_CHAT_MODEL;
            }

            return uniqueModels[0];
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch models", error);
          onErrorRef.current?.(error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };

    void fetchModels();
    hasFetchedRef.current = true;

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [connectionStatus, refreshKey, setAvailableModels, setIsLoadingModels, setSelectedModel]);
};

export default useAvailableModels;
