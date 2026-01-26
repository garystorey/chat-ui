import { ApiStreamRequestOptions } from "../types";
import { buildRequest, parseJson, isJsonLike, ApiError } from "./request";

const parseSseEvents = <TMessage>(
  chunk: string,
  flush: boolean,
  handleEvent: (data: string) => boolean,
) => {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const segments = normalized.split("\n\n");
  const remainder = flush ? "" : (segments.pop() ?? "");

  for (const segment of segments) {
    const lines = segment.split("\n");
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.replace(/^data:\s*/, ""));
      }
    }

    if (!dataLines.length) {
      continue;
    }

    const data = dataLines.join("\n");
    const shouldStop = handleEvent(data);
    if (shouldStop) {
      return { remainder: "", shouldStop: true };
    }
  }

  return { remainder, shouldStop: false };
};

export async function apiStreamRequest<TMessage, TResponse>({
  path,
  method = "GET",
  body,
  headers,
  signal,
  onMessage,
  parseMessage,
  buildResponse,
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
    let message = response.statusText || "Request failed";

    if (errorData && isJsonLike(errorData)) {
      if (
        "message" in errorData &&
        typeof (errorData as Record<string, unknown>).message === "string"
      ) {
        message = (errorData as Record<string, string>).message;
      } else if (
        "error" in errorData &&
        typeof (errorData as Record<string, unknown>).error === "string"
      ) {
        message = (errorData as Record<string, string>).error;
      } else if (
        "error" in errorData &&
        isJsonLike((errorData as Record<string, unknown>).error)
      ) {
        const errorObject = (errorData as Record<string, unknown>)
          .error as Record<string, unknown>;
        if (
          "message" in errorObject &&
          typeof errorObject.message === "string"
        ) {
          message = errorObject.message;
        }
      }
    }

    throw new ApiError(message, response.status, errorData);
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
  const parse =
    parseMessage ?? ((data: string) => JSON.parse(data) as TMessage);

  while (!shouldStop) {
    const { value, done } = await reader.read();
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

  return buildResponse(messages);
}
