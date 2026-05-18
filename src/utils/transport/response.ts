import type { ErrorHandler } from "../adapters/errorHandler";
import {
  createApiError,
  defaultErrorHandler,
} from "../adapters/errorHandler";
import { parseJson } from "../request";

export const throwApiResponseError = async (
  response: Response,
  errorHandler: ErrorHandler = defaultErrorHandler,
) => {
  const errorData = await parseJson(response).catch(() => null);
  throw createApiError(response, errorData, errorHandler);
};

export const isEventStreamResponse = (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  return Boolean(response.body && contentType.includes("text/event-stream"));
};
