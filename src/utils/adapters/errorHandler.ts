import type { Response } from "node-fetch";
import { isJsonLike } from "../request";

export type ErrorHandler = {
  extractMessage: (response: Response, data: unknown) => string;
  handle: (error: unknown) => void;
};

export const defaultErrorHandler: ErrorHandler = {
  extractMessage: (response: Response, data: unknown) => {
    let message = response.statusText || "Request failed";

    if (data && isJsonLike(data)) {
      if (
        "message" in (data as Record<string, unknown>) &&
        typeof (data as Record<string, unknown>).message === "string"
      ) {
        message = (data as Record<string, string>).message;
      } else if (
        "error" in (data as Record<string, unknown>) &&
        typeof (data as Record<string, unknown>).error === "string"
      ) {
        message = (data as Record<string, string>).error;
      } else if (
        "error" in (data as Record<string, unknown>) &&
        isJsonLike((data as Record<string, unknown>).error)
      ) {
        const errorObject = (data as Record<string, unknown>).error as Record<string, unknown>;
        if ("message" in errorObject && typeof errorObject.message === "string") {
          message = errorObject.message;
        }
      }
    }

    return message;
  },
  handle: (error: unknown) => {
    // default: best-effort console logging
    // eslint-disable-next-line no-console
    console.error(error);
  },
};

export default defaultErrorHandler;
