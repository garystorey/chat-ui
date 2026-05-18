import { API_BASE_URL, OPENAI_API_KEY } from "../../config/App.config";
import { readViteEnv } from "../../config/env";

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

