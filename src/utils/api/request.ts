import { ApiRequestOptions } from "../../types";
import { buildRequestOptions } from "./requestBuilder";

export const isJsonLike = (
  value: unknown,
): value is Record<string, unknown> | unknown[] => {
  if (!value) {
    return false;
  }

  if (
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob
  ) {
    return false;
  }

  if (typeof value === "string") {
    return false;
  }

  return typeof value === "object";
};

export const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse server response as JSON");
  }
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const buildRequest = (opts: ApiRequestOptions) => buildRequestOptions(opts);
