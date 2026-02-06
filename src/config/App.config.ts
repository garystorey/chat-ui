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
