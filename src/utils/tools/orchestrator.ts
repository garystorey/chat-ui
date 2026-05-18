import type {
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamArgs,
  ChatCompletionTool,
  ChatCompletionToolCall,
  LocalToolExecutionResult,
  MessageToolInvocation,
} from "../../types";
import {
  extractAssistantToolCalls,
  getAssistantChoice,
} from "../transform";
import {
  toPendingToolInvocations,
  toCompletedToolInvocations,
  toToolResultMessages,
} from "./localTools";

export type RunToolOrchestrationOptions = {
  model: string;
  initialMessages: ChatCompletionMessage[];
  tools: ChatCompletionTool[];
  maxToolRounds: number;
  sendChatCompletion: (args: ChatCompletionStreamArgs) => void;
  updateAssistantToolInvocations: (
    toolInvocations: MessageToolInvocation[],
    options?: { skipIfUnchanged?: boolean },
  ) => void;
  executeLocalToolCalls: (
    toolCalls: ChatCompletionToolCall[],
  ) => Promise<LocalToolExecutionResult[]>;
  onStreamUpdate: (content: string) => void;
  onStreamComplete: (content: string) => void;
  onError: (error: unknown) => void;
  onSettled?: () => void;
  onResponse?: (response: ChatCompletionResponse) => void;
};

const streamRequest = (
  body: ChatCompletionRequest,
  sendChatCompletion: (args: ChatCompletionStreamArgs) => void,
  onStreamUpdate: (content: string) => void,
  onStreamComplete: (content: string) => void,
  onError: (error: unknown) => void,
  onSettled?: () => void,
  onResponse?: (response: ChatCompletionResponse) => void,
): Promise<ChatCompletionResponse> =>
  new Promise<ChatCompletionResponse>((resolve, reject) => {
    let didSettle = false;

    sendChatCompletion(
      {
        body,
        onStreamUpdate,
        onStreamComplete,
        onResponse: (response) => {
          didSettle = true;
          onResponse?.(response);
          resolve(response);
        },
        onError: (error) => {
          didSettle = true;
          reject(error);
        },
        onSettled: () => {
          if (!didSettle) {
            reject(new DOMException("Aborted", "AbortError"));
          }
          onSettled?.();
        },
      },
    );
  });

export const runToolOrchestration = async (
  options: RunToolOrchestrationOptions,
): Promise<ChatCompletionResponse> => {
  const {
    model,
    initialMessages,
    tools,
    maxToolRounds,
    sendChatCompletion,
    updateAssistantToolInvocations,
    executeLocalToolCalls,
    onStreamUpdate,
    onStreamComplete,
    onError,
    onSettled,
    onResponse,
  } = options;

  let requestMessages = initialMessages;
  let toolRoundCount = 0;

  while (true) {
    const response = await streamRequest(
      {
        model,
        messages: requestMessages,
        stream: true,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: false,
      },
      sendChatCompletion,
      onStreamUpdate,
      onStreamComplete,
      onError,
      onSettled,
      onResponse,
    );

    const assistantChoice = getAssistantChoice(response);
    const assistantToolCalls = extractAssistantToolCalls(response);
    const shouldExecuteTools =
      assistantChoice?.finish_reason === "tool_calls" &&
      assistantToolCalls.length > 0;

    if (!shouldExecuteTools) {
      return response;
    }

    if (toolRoundCount >= maxToolRounds) {
      throw new Error("Reached tool execution limit.");
    }

    toolRoundCount += 1;

    updateAssistantToolInvocations(
      toPendingToolInvocations(assistantToolCalls),
    );

    const executionResults = await executeLocalToolCalls(assistantToolCalls);

    updateAssistantToolInvocations(
      toCompletedToolInvocations(executionResults),
    );

    const assistantToolMessage: ChatCompletionMessage = {
      role: "assistant",
      content: assistantChoice?.message?.content ?? null,
      tool_calls: assistantToolCalls,
    };

    requestMessages = [
      ...requestMessages,
      assistantToolMessage,
      ...toToolResultMessages(executionResults),
    ];
  }
};
