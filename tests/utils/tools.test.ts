import { describe, expect, it } from "vitest";
import type { ChatCompletionToolCall } from "../../src/types";
import {
  executeLocalToolCalls,
  toCompletedToolInvocations,
  toPendingToolInvocations,
  toToolResultMessages,
} from "../../src/utils/tools";

describe("tools utilities", () => {
  it("executes known tools and returns tool role messages", async () => {
    const toolCalls: ChatCompletionToolCall[] = [
      {
        id: "call-1",
        type: "function",
        function: {
          name: "echo",
          arguments: '{"text":"hello"}',
        },
      },
    ];

    const results = await executeLocalToolCalls(toolCalls);
    const messages = toToolResultMessages(results);

    expect(results[0]?.status).toBe("success");
    expect(messages[0]).toMatchObject({
      role: "tool",
      tool_call_id: "call-1",
    });
  });

  it("returns structured error result for unknown tools", async () => {
    const toolCalls: ChatCompletionToolCall[] = [
      {
        id: "call-2",
        type: "function",
        function: {
          name: "does_not_exist",
          arguments: "{}",
        },
      },
    ];

    const results = await executeLocalToolCalls(toolCalls);

    expect(results[0]?.status).toBe("error");
    expect(results[0]?.result).toContain("Unknown tool");
  });

  it("builds pending and completed invocation metadata", async () => {
    const toolCalls: ChatCompletionToolCall[] = [
      {
        id: "call-3",
        type: "function",
        function: {
          name: "echo",
          arguments: '{"text":"ok"}',
        },
      },
    ];

    const pending = toPendingToolInvocations(toolCalls);
    const results = await executeLocalToolCalls(toolCalls);
    const completed = toCompletedToolInvocations(results);

    expect(pending[0]).toMatchObject({
      id: "call-3",
      status: "pending",
    });
    expect(completed[0]).toMatchObject({
      id: "call-3",
      status: "success",
    });
  });
});
