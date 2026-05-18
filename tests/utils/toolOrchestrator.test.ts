import { describe, it, expect, vi } from "vitest";
import { runToolOrchestration } from "../../src/utils/toolOrchestrator";
import type {
  ChatCompletionMessage,
  ChatCompletionResponse,
  ChatCompletionToolCall,
  LocalToolExecutionResult,
  ChatCompletionTool,
} from "../../src/types";

const makeResponse = (
  choices: ChatCompletionResponse["choices"],
): ChatCompletionResponse => ({
  choices,
});

const simpleTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "echo",
    description: "Echo back text.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
};

const makeToolCall = (id: string, name: string, args: string): ChatCompletionToolCall => ({
  id,
  type: "function",
  function: {
    name,
    arguments: args,
  },
});

describe("runToolOrchestration", () => {
  it("resolves immediately when no tool calls are returned", async () => {
    const sendChatCompletion = vi.fn(({ onResponse, onSettled }) => {
      onResponse?.(makeResponse([
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello",
          },
          finish_reason: "stop",
        },
      ]));
      onSettled?.();
    });
    const updateAssistantToolInvocations = vi.fn();
    const executeLocalToolCalls = vi.fn();

    const response = await runToolOrchestration({
      model: "test-model",
      initialMessages: [
        {
          role: "user",
          content: "Hello",
        },
      ] as ChatCompletionMessage[],
      tools: [simpleTool],
      maxToolRounds: 3,
      sendChatCompletion,
      updateAssistantToolInvocations,
      executeLocalToolCalls,
      onStreamUpdate: vi.fn(),
      onStreamComplete: vi.fn(),
      onError: vi.fn(),
      onSettled: vi.fn(),
      onResponse: vi.fn(),
    });

    expect(response.choices[0].message.content).toBe("Hello");
    expect(sendChatCompletion).toHaveBeenCalledTimes(1);
    expect(updateAssistantToolInvocations).not.toHaveBeenCalled();
    expect(executeLocalToolCalls).not.toHaveBeenCalled();
  });

  it("executes a tool round and updates invocations", async () => {
    const toolCall = makeToolCall("tool-1", "echo", '{"text":"hi"}');
    let callCount = 0;
    const sendChatCompletion = vi.fn(({ onResponse, onSettled }) => {
      if (callCount === 0) {
        onResponse?.(makeResponse([
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Processing",
              tool_calls: [toolCall],
            },
            finish_reason: "tool_calls",
          },
        ]));
      } else {
        onResponse?.(makeResponse([
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Done",
            },
            finish_reason: "stop",
          },
        ]));
      }
      callCount += 1;
      onSettled?.();
    });

    const updateAssistantToolInvocations = vi.fn();
    const executeLocalToolCalls = vi.fn(async () => [
      {
        toolCallId: "tool-1",
        name: "echo",
        arguments: '{"text":"hi"}',
        status: "success",
        result: JSON.stringify({ text: "hi" }),
        message: {
          role: "tool",
          tool_call_id: "tool-1",
          content: JSON.stringify({ ok: true, result: { text: "hi" } }),
        },
      },
    ] as LocalToolExecutionResult[]);

    const response = await runToolOrchestration({
      model: "test-model",
      initialMessages: [
        {
          role: "user",
          content: "Hello",
        },
      ] as ChatCompletionMessage[],
      tools: [simpleTool],
      maxToolRounds: 3,
      sendChatCompletion,
      updateAssistantToolInvocations,
      executeLocalToolCalls,
      onStreamUpdate: vi.fn(),
      onStreamComplete: vi.fn(),
      onError: vi.fn(),
      onSettled: vi.fn(),
      onResponse: vi.fn(),
    });

    expect(sendChatCompletion).toHaveBeenCalledTimes(2);
    expect(updateAssistantToolInvocations).toHaveBeenCalledTimes(2);
    expect(executeLocalToolCalls).toHaveBeenCalledTimes(1);
    expect(response.choices[0].message.content).toBe("Done");
  });
});
