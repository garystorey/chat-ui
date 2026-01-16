import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { DEFAULT_CHAT_MODEL } from "../config";
import { buildRequest, isJsonLike, parseJson } from "../utils";
import type { ConnectionStatus } from "../types";
import useLatestRef from "./useLatestRef";

const useAvailableModels = ({
  connectionStatus,
  setAvailableModels,
  setSelectedModel,
  setIsLoadingModels,
  onError,
  hasUserSelectedModel,
}: {
  connectionStatus: ConnectionStatus;
  setAvailableModels: Dispatch<SetStateAction<string[]>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setIsLoadingModels: Dispatch<SetStateAction<boolean>>;
  onError?: (error: unknown) => void;
  hasUserSelectedModel: boolean;
}) => {
  const onErrorRef = useLatestRef(onError);
  const hasUserSelectedModelRef = useLatestRef(hasUserSelectedModel);
  const lastNonConnectingStatusRef = useRef<ConnectionStatus | null>(
    connectionStatus === "connecting" ? null : connectionStatus
  );

  useEffect(() => {
    if (connectionStatus === "connecting") {
      return undefined;
    }

    if (connectionStatus === "offline") {
      lastNonConnectingStatusRef.current = "offline";
      return undefined;
    }

    if (lastNonConnectingStatusRef.current === "online") {
      return undefined;
    }

    lastNonConnectingStatusRef.current = "online";

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

        const modelData = Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: Array<{ id?: unknown; [key: string]: unknown }> }).data
          : [];
        const models = modelData
          .map((model) => model?.id)
          .filter((id): id is string => typeof id === "string");
        const defaultModelIdFromList = modelData.find(
          (model) =>
            model?.default === true ||
            model?.is_default === true ||
            model?.isDefault === true ||
            model?.is_default_model === true ||
            model?.isDefaultModel === true
        )?.id;
        const defaultModelIdFromResponse =
          typeof (data as { default?: unknown }).default === "string"
            ? (data as { default: string }).default
            : typeof (data as { default_model?: unknown }).default_model === "string"
              ? (data as { default_model: string }).default_model
              : typeof (data as { defaultModel?: unknown }).defaultModel === "string"
                ? (data as { defaultModel: string }).defaultModel
                : undefined;
        const defaultModelId =
          typeof defaultModelIdFromList === "string"
            ? defaultModelIdFromList
            : defaultModelIdFromResponse;

        if (!models.length) {
          setAvailableModels([]);
          setSelectedModel(DEFAULT_CHAT_MODEL);
        } else {
          const uniqueModels = Array.from(new Set(models));

          setAvailableModels(uniqueModels);
          setSelectedModel((current) => {
            if (hasUserSelectedModelRef.current && uniqueModels.includes(current)) {
              return current;
            }

            if (defaultModelId && uniqueModels.includes(defaultModelId)) {
              return defaultModelId;
            }

            if (uniqueModels.includes(current)) {
              return current;
            }

            if (hasUserSelectedModelRef.current) {
              return uniqueModels[0];
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

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    connectionStatus,
    setAvailableModels,
    setIsLoadingModels,
    setSelectedModel,
  ]);
};

export default useAvailableModels;
