// Chat-related hooks
export { default as useChatCompletionStream } from "./useChatCompletionStream";
export { default as useAvailableModels } from "./useAvailableModels";
export { SELECTED_MODEL_STORAGE_KEY } from "./useAvailableModels";
export { default as usePersistChatHistory } from "./usePersistChatHistory";
export { default as useHydrateActiveChat } from "./useHydrateActiveChat";
export { default as useConnectionListeners } from "./useConnectionListeners";
export { default as useChatHeaderLogic } from "./useChatHeaderLogic";
export { default as useToolOrchestration } from "./useToolOrchestration";
export { default as useConnectionStatus } from "./useConnectionStatus";
export { default as useAsyncAction } from "./useAsyncAction";

// UI / interaction hooks
export { default as useAutoResizeTextarea } from "./useAutoResizeTextarea";
export { default as useChatLogLiveRegion } from "./useChatLogLiveRegion";
export { default as useLatestRef } from "./useLatestRef";
export { default as usePrefersReducedMotion } from "./usePrefersReducedMotion";
export { default as useScrollToBottom } from "./useScrollToBottom";
export { default as useTheme } from "./useTheme";
export { default as useToggleBodyClass } from "./useToggleBodyClass";
export { default as useSpeechRecognition } from "./useSpeechRecognition";

// Toast / misc
export { default as useToast } from "./useToast";
export { default as useToastManager } from "./useToastManager";

// Helpers
export { default as useAbortableEffect } from "./useAbortableEffect";
