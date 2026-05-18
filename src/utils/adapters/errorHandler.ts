import { ApiError, isJsonLike } from "../api";

type ErrorData = Record<string, unknown>;

const getStringField = (data: ErrorData, key: string) => {
  const value = data[key];
  return typeof value === "string" ? value : null;
};

export const extractErrorMessage = (response: Response, data: unknown) => {
  let message = response.statusText || "Request failed";

  if (!data || !isJsonLike(data)) {
    return message;
  }

  const errorData = data as ErrorData;
  const topLevelMessage =
    getStringField(errorData, "message") ?? getStringField(errorData, "error");

  if (topLevelMessage) {
    return topLevelMessage;
  }

  const nestedError = errorData.error;
  if (nestedError && isJsonLike(nestedError)) {
    const nestedMessage = getStringField(nestedError as ErrorData, "message");
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return message;
};

export type ErrorHandler = {
  extractMessage: (response: Response, data: unknown) => string;
  handle: (error: unknown) => void;
};

export const defaultErrorHandler: ErrorHandler = {
  extractMessage: extractErrorMessage,
  handle: () => {},
};

export const createApiError = (
  response: Response,
  data: unknown,
  errorHandler: ErrorHandler = defaultErrorHandler,
) => {
  const message = errorHandler.extractMessage(response, data);
  const error = new ApiError(message, response.status, data);
  errorHandler.handle(error);
  return error;
};

export default defaultErrorHandler;
