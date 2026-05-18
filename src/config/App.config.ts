import { readViteBooleanEnv, readViteIntegerEnv } from "../utils/config";

export const API_BASE_URL = "http://192.168.86.28:1234";
export const OPENAI_API_KEY = "";
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

