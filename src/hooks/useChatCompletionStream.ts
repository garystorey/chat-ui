import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  ApiError,
  apiStreamRequest,
  buildChatCompletionResponse,
  extractAssistantReply,
  getChatCompletionContentText,
  stripAssistantArtifacts,
} from "../utils";
import type {
  ChatCompletionMutationVariables,
  ChatCompletionStreamArgs,
  ChatCompletionResponse,
  ChatCompletionStreamResponse,
  ChatCompletionRequest,
  ChatCompletionContentPart,
} from "../types";
import { CHAT_COMPLETION_PATH } from "../config";

const STREAM_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

const stripDataUrlPrefix = (value: string) => {
  const match = value.match(/^data:.*?;base64,(.*)$/);
  return match?.[1] ?? null;
};

const toRawBase64 = (value: string) => {
  if (value.startsWith("data:")) {
    const extracted = stripDataUrlPrefix(value);
    return extracted && base64Pattern.test(extracted) ? extracted : null;
  }

  return base64Pattern.test(value) ? value : null;
};

const toDataUrl = (value: string) => {
  if (value.startsWith("data:")) {
    return value;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (base64Pattern.test(value)) {
    return `data:image/png;base64,${value}`;
  }
  return null;
};

type ChatCompletionImagePart = Extract<ChatCompletionContentPart, { type: "image_url" }>;

const isImagePart = (part: ChatCompletionContentPart): part is ChatCompletionImagePart =>
  part.type === "image_url" &&
  "image_url" in part &&
  typeof (part as { image_url?: { url?: unknown } }).image_url?.url === "string";

const hasImageParts = (body: ChatCompletionRequest) =>
  Array.isArray(body.messages) &&
  body.messages.some((message) => {
    const { content } = message;
    return Array.isArray(content) && content.some((part) => isImagePart(part));
  });

const transformImageUrls = (
  body: ChatCompletionRequest,
  transformer: (value: string) => string | null,
) => {
  let didTransform = false;

  const nextMessages = body.messages.map((message) => {
    const { content } = message;
    if (!Array.isArray(content)) {
      return message;
    }

    const nextContent = content.map((part) => {
      if (!isImagePart(part)) {
        return part;
      }

      const currentUrl = part.image_url.url;

      const nextUrl = transformer(currentUrl);
      if (!nextUrl || nextUrl === currentUrl) {
        return part;
      }

      didTransform = true;
      return {
        ...part,
        image_url: {
          ...part.image_url,
          url: nextUrl,
        },
      };
    });

    return {
      ...message,
      content: nextContent,
    };
  });

  return {
    didTransform,
    body: {
      ...body,
      messages: nextMessages,
    },
  };
};

export default function useChatCompletionStream() {
  const {
    mutate: sendChatCompletion,
    reset: resetChatCompletion,
    status: chatCompletionStatus,
  } = useMutation<
    ChatCompletionResponse,
    ApiError,
    ChatCompletionMutationVariables
  >({
    mutationKey: ["chatCompletion"],
    networkMode: "always",
    mutationFn: async ({ body, signal, onChunk }) => {
      const attempt = (nextBody: ChatCompletionRequest) => {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        return apiStreamRequest<ChatCompletionStreamResponse, ChatCompletionResponse>({
          path: CHAT_COMPLETION_PATH,
          method: "POST",
          body: nextBody,
          signal,
          idleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
          onMessage: onChunk,
          buildResponse: buildChatCompletionResponse,
        });
      };

      try {
        return await attempt(body);
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }

        if (error instanceof ApiError && error.status === 400 && hasImageParts(body)) {
          const message = error.message.toLowerCase();

          if (message.includes("base64") || message.includes("encoded image")) {
            const result = transformImageUrls(body, (value) => toRawBase64(value));
            if (result.didTransform) {
              return attempt(result.body);
            }
          }

          if (message.includes("invalid url")) {
            const result = transformImageUrls(body, (value) => toDataUrl(value));
            if (result.didTransform) {
              return attempt(result.body);
            }
          }
        }

        throw error;
      }
    },
  });
  const pendingRequestRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef("");
  const streamFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const send = useCallback(
    ({
      body,
      onStreamUpdate,
      onStreamComplete,
      onError,
      onSettled,
    }: ChatCompletionStreamArgs) => {
      let assistantReply = "";

      const flushStreamBuffer = () => {
        if (!streamBufferRef.current) {
          return;
        }

        assistantReply += streamBufferRef.current;
        streamBufferRef.current = "";
        onStreamUpdate(assistantReply);
      };

      const scheduleStreamFlush = () => {
        if (streamFlushTimeoutRef.current) {
          return;
        }

        streamFlushTimeoutRef.current = setTimeout(() => {
          streamFlushTimeoutRef.current = null;
          flushStreamBuffer();
        }, 100);
      };

      const clearStreamState = () => {
        if (streamFlushTimeoutRef.current) {
          clearTimeout(streamFlushTimeoutRef.current);
          streamFlushTimeoutRef.current = null;
        }

        streamBufferRef.current = "";
      };

      const controller = new AbortController();
      pendingRequestRef.current = controller;

      sendChatCompletion(
        {
          body,
          signal: controller.signal,
          onChunk: (chunk: ChatCompletionStreamResponse) => {
            const contentDelta = chunk?.choices?.reduce((acc, choice) => {
              if (choice.delta?.content) {
                const deltaText = getChatCompletionContentText(
                  choice.delta.content,
                );
                if (deltaText) {
                  return acc + stripAssistantArtifacts(deltaText);
                }
              }
              return acc;
            }, "");

            if (!contentDelta) {
              return;
            }

            streamBufferRef.current += contentDelta;
            scheduleStreamFlush();
          },
        },
        {
          onSuccess: (response: ChatCompletionResponse) => {
            flushStreamBuffer();
            clearStreamState();

            const finalAssistantReply = extractAssistantReply(response);
            if (!finalAssistantReply) {
              return;
            }

            assistantReply = finalAssistantReply;
            onStreamComplete(finalAssistantReply);
          },
          onError: (error: unknown) => {
            clearStreamState();

            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            onError(error);
          },
          onSettled: () => {
            if (pendingRequestRef.current === controller) {
              pendingRequestRef.current = null;
            }

            clearStreamState();
            onSettled?.();
          },
        },
      );
    },
    [sendChatCompletion],
  );

  return {
    status: chatCompletionStatus,
    reset: resetChatCompletion,
    pendingRequestRef,
    send,
  };
}
