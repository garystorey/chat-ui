const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Use a relative base URL by default so local development can rely on the
// Vite dev server proxy, avoiding CORS errors when the API does not include
// the correct headers. Set VITE_API_BASE_URL to override this value.
export const API_BASE_URL = envApiBaseUrl && envApiBaseUrl.length > 0 ? envApiBaseUrl : '';
export const CHAT_COMPLETION_PATH = '/v1/chat/completions';
export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
export const ASSISTANT_ERROR_MESSAGE =
  "Sorry, I had trouble reaching the assistant. Please try again.";
export const OPENAI_API_KEY = '';
export const OPENAI_BETA_FEATURES = 'assistants=v2';

export default {
  API_BASE_URL,
  CHAT_COMPLETION_PATH,
  DEFAULT_CHAT_MODEL,
  ASSISTANT_ERROR_MESSAGE,
  OPENAI_API_KEY,
  OPENAI_BETA_FEATURES,
};
