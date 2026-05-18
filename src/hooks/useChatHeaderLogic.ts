import { useCallback, useEffect, useState } from "react";
import useAvailableModels, { SELECTED_MODEL_STORAGE_KEY } from "./useAvailableModels";
import { useConnection } from "../contexts/ConnectionContext";

export default function useChatHeaderLogic() {
  const { connectionStatus } = useConnection();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasHeaderModelOptions = availableModels.length > 0;

  useAvailableModels({
    connectionStatus,
    refreshKey,
    setAvailableModels,
    setSelectedModel,
    setIsLoadingModels,
    onError: (error) => {
      // keep minimal logging here; callers can show toast if desired
      console.error("useChatHeaderLogic: failed to load models", error);
    },
  });

  useEffect(() => {
    try {
      if (selectedModel) {
        window.localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModel);
      } else {
        window.localStorage.removeItem(SELECTED_MODEL_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [selectedModel]);

  const refreshModels = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    availableModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    hasHeaderModelOptions,
    refreshModels,
  } as const;
}
