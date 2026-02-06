import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { buildRequest, isJsonLike, parseJson } from "../utils";
import type { ConnectionStatus } from "../types";
import useLatestRef from "./useLatestRef";

const DEFAULT_SERVER_MODEL = "default";

export const SELECTED_MODEL_STORAGE_KEY = "chat-ui-selected-model";

const getStoredSelectedModelId = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(SELECTED_MODEL_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return stored;
  } catch {
    return null;
  }
};

const getLoadedModelId = (data: unknown): string | null => {
  if (!isJsonLike(data)) {
    return null;
  }

  const topLevel = data as Record<string, unknown>;
  const loadedFromTopLevel = [
    topLevel.loaded_model,
    topLevel.current_model,
    topLevel.active_model,
    topLevel.model,
  ].find((value) => typeof value === "string") as string | undefined;

  if (loadedFromTopLevel) {
    return loadedFromTopLevel;
  }

  const entries = Array.isArray(topLevel.data)
    ? (topLevel.data as Array<Record<string, unknown>>)
    : [];

  const loadedEntry = entries.find((model) => {
    const status = model?.status;
    const state = model?.state;
    return (
      model?.loaded === true ||
      model?.is_loaded === true ||
      model?.isLoaded === true ||
      model?.active === true ||
      model?.is_active === true ||
      model?.isActive === true ||
      status === "loaded" ||
      status === "ready" ||
      state === "loaded" ||
      state === "ready"
    );
  });

  return typeof loadedEntry?.id === "string" ? loadedEntry.id : null;
};

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
          ? (data as { data: Array<{ id?: unknown }> }).data
              .map((model) => model?.id)
              .filter((id): id is string => typeof id === "string")
          : [];

        if (!models.length) {
          setAvailableModels([]);
          setSelectedModel("");
        } else {
          const uniqueModels = Array.from(new Set(models));
          const loadedModelId = getLoadedModelId(data);
          const nextModels =
            loadedModelId && !uniqueModels.includes(loadedModelId)
              ? [loadedModelId, ...uniqueModels]
              : uniqueModels;

          setAvailableModels(nextModels);
          setSelectedModel((currentSelected) => {
            const storedSelected = getStoredSelectedModelId();

            if (loadedModelId) {
              return loadedModelId;
            }

            if (currentSelected && nextModels.includes(currentSelected)) {
              return currentSelected;
            }

            if (storedSelected && nextModels.includes(storedSelected)) {
              return storedSelected;
            }

            if (nextModels.includes(DEFAULT_SERVER_MODEL)) {
              return DEFAULT_SERVER_MODEL;
            }

            return nextModels[0] ?? "";
          });
        }

        hasFetchedRef.current = true;
      } catch (error) {
        hasFetchedRef.current = false;
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

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    connectionStatus,
    refreshKey,
    setAvailableModels,
    setIsLoadingModels,
    setSelectedModel,
  ]);
};

export default useAvailableModels;
