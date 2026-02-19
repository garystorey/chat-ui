export const API_BASE_URL = "http://192.168.86.28:1234";
export const OPENAI_API_KEY = "";

const readViteEnv = (key: string): string | undefined => {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[
      key
    ];
  } catch (error) {
    return undefined;
  }
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "").trim();

const readViteBooleanEnv = (key: string, fallback = false) => {
  const value = readViteEnv(key);
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return fallback;
};

const readViteIntegerEnv = (key: string, fallback: number) => {
  const value = readViteEnv(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const getApiBaseUrl = (): string => {
  const envValue =
    readViteEnv("VITE_API_BASE_URL") ??
    readViteEnv("VITE_API_URL") ??
    readViteEnv("VITE_OPENAI_BASE_URL") ??
    readViteEnv("VITE_OPENAI_API_BASE_URL");
  if (envValue && envValue.trim()) {
    return normalizeBaseUrl(envValue);
  }

  return normalizeBaseUrl(API_BASE_URL);
};

export const getOpenAIApiKey = (): string => {
  const envValue = readViteEnv("VITE_OPENAI_API_KEY") ?? readViteEnv("VITE_API_KEY");
  return envValue?.trim() ?? OPENAI_API_KEY;
};

export const CHAT_COMPLETION_PATH = "/v1/chat/completions";
export const ASSISTANT_ERROR_MESSAGE =
  "Sorry, I had trouble reaching the assistant. Please try again.";
export const OPENAI_BETA_FEATURES = "assistants=v2";
export const ENABLE_TOOL_CALLS = readViteBooleanEnv(
  "VITE_ENABLE_TOOL_CALLS",
  false,
);
export const MAX_TOOL_CALL_ROUNDS = readViteIntegerEnv(
  "VITE_MAX_TOOL_CALL_ROUNDS",
  4,
);
