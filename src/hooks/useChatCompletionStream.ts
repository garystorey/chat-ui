import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  ApiError,
  apiStreamRequest,
  buildChatCompletionResponse,
  extractAssistantReply,
  getChatCompletionContentText,
} from "../utils";
import type {
  ChatCompletionMutationVariables,
  ChatCompletionStreamArgs,
  ChatCompletionResponse,
  ChatCompletionStreamResponse,
} from "../types";
import { CHAT_COMPLETION_PATH } from "../config";

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
      return apiStreamRequest<
        ChatCompletionStreamResponse,
        ChatCompletionResponse
      >({
        path: CHAT_COMPLETION_PATH,
        method: "POST",
        body,
        signal,
        onMessage: onChunk,
        buildResponse: buildChatCompletionResponse,
      });
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

        streamFlushTimeoutRef.current = window.setTimeout(() => {
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
                  return acc + deltaText;
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
            onSettled();
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
