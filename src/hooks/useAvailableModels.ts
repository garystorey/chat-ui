import { useEffect, type Dispatch, type SetStateAction } from "react";
import { buildRequest, isJsonLike, parseJson } from "../utils";
import type { ConnectionStatus } from "../types";

const DEFAULT_SERVER_MODEL = "default";

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
  setAvailableModels,
  setSelectedModel,
  setIsLoadingModels,
}: {
  connectionStatus: ConnectionStatus;
  setAvailableModels: Dispatch<SetStateAction<string[]>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setIsLoadingModels: Dispatch<SetStateAction<boolean>>;
}) => {
  useEffect(() => {
    if (connectionStatus !== "online") {
      return undefined;
    }

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
          setSelectedModel("");
        } else {
          const uniqueModels = Array.from(new Set(models));
          const loadedModelId = getLoadedModelId(data);

          setAvailableModels(uniqueModels);
          setSelectedModel(() => {
            if (loadedModelId && uniqueModels.includes(loadedModelId)) {
              return loadedModelId;
            }

            if (uniqueModels.includes(DEFAULT_SERVER_MODEL)) {
              return DEFAULT_SERVER_MODEL;
            }

            return "";
          });
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to fetch models", error);
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
  }, [connectionStatus, setAvailableModels, setIsLoadingModels, setSelectedModel]);
};

export default useAvailableModels;
