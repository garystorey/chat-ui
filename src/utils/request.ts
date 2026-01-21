import { API_BASE_URL, OPENAI_API_KEY, OPENAI_BETA_FEATURES } from "../config";
import { ApiRequestOptions } from "../types";

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

export const buildRequest = ({
  path,
  method = "GET",
  body,
  headers,
  signal,
}: ApiRequestOptions) => {
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (OPENAI_API_KEY && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${OPENAI_API_KEY}`;
  }

  if (OPENAI_BETA_FEATURES && !requestHeaders["OpenAI-Beta"]) {
    requestHeaders["OpenAI-Beta"] = OPENAI_BETA_FEATURES;
  }

  let requestBody: BodyInit | undefined;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    typeof body === "string"
  ) {
    requestBody = body as BodyInit;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    url,
    requestHeaders,
    requestBody,
    method,
    signal,
  };
};
