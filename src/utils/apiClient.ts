import { ApiStreamRequestOptions } from "../types";
import { buildRequest, parseJson, isJsonLike, ApiError } from "./request";
import { parseSseEvents } from "./sseParser";
import type { ErrorHandler } from "./adapters/errorHandler";
import { defaultErrorHandler } from "./adapters/errorHandler";

export async function apiStreamRequest<TMessage, TResponse>({
  path,
  method = "GET",
  body,
  headers,
  signal,
  idleTimeoutMs,
  onMessage,
  parseMessage,
  buildResponse,
  errorHandler = defaultErrorHandler,
}: ApiStreamRequestOptions<TMessage, TResponse>): Promise<TResponse> {
  const { url, requestHeaders, requestBody } = buildRequest({
    path,
    method,
    body,
    headers: {
      Accept: "text/event-stream",
      ...headers,
    },
    signal,
  });

  const response = await fetch(url, {
    method,
    body: requestBody,
    headers: requestHeaders,
    signal,
  });

  if (!response.ok) {
    const errorData = await parseJson(response).catch(() => null);
    const message = errorHandler?.extractMessage(response as any, errorData);
    const apiError = new ApiError(message, response.status, errorData);
    errorHandler?.handle(apiError);
    throw apiError;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.body || !contentType.includes("text/event-stream")) {
    const data = await parseJson(response);
    return data as TResponse;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const messages: TMessage[] = [];
  let buffer = "";
  let shouldStop = false;
  const parse = parseMessage ?? ((data: string) => JSON.parse(data) as TMessage);

  const readWithTimeout = async () => {
    if (!idleTimeoutMs || idleTimeoutMs <= 0) {
      return reader.read();
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Stream idle timeout"));
          }, idleTimeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  };

  try {
    while (!shouldStop) {
      const { value, done } = await readWithTimeout();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const result = parseSseEvents<TMessage>(buffer, done, (data) => {
        if (data === "[DONE]") {
          shouldStop = true;
          return true;
        }
        try {
          const message = parse(data);
          messages.push(message);
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse stream message", error);
        }
        return false;
      });

      buffer = result.remainder;
      shouldStop = shouldStop || result.shouldStop || done;
    }
  } finally {
    reader.cancel().catch(() => {
      /* best-effort cleanup */
    });
  }

  return buildResponse(messages);
}
