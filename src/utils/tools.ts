import type {
  ChatCompletionMessage,
  ChatCompletionTool,
  ChatCompletionToolCall,
  MessageToolInvocation,
} from "../types";

const UTC_OFFSET_PATTERN = /^[+-](?:0\d|1[0-4]):[0-5]\d$/;

const DEFAULT_TOOL_ERROR = "Tool execution failed.";

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseToolArguments = (rawArguments: string) => {
  if (!rawArguments.trim()) {
    return { ok: true as const, value: {} as Record<string, unknown> };
  }

  try {
    const parsed = JSON.parse(rawArguments) as unknown;
    if (!isJsonObject(parsed)) {
      return {
        ok: false as const,
        error: "Tool arguments must be a JSON object.",
      };
    }
    return { ok: true as const, value: parsed };
  } catch {
    return {
      ok: false as const,
      error: "Tool arguments must be valid JSON.",
    };
  }
};

const getCurrentTime = (args: Record<string, unknown>) => {
  const utcOffset =
    typeof args.utc_offset === "string" && UTC_OFFSET_PATTERN.test(args.utc_offset)
      ? args.utc_offset
      : "+00:00";

  const sign = utcOffset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = utcOffset.slice(1).split(":").map(Number);
  const offsetMinutes = sign * (hours * 60 + minutes);
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const localMs = utcMs + offsetMinutes * 60_000;
  const localDate = new Date(localMs);

  const isoLike = localDate.toISOString().replace("Z", utcOffset);

  return {
    utc_offset: utcOffset,
    now: isoLike,
    unix_ms: localMs,
  };
};

const echo = (args: Record<string, unknown>) => {
  const text = typeof args.text === "string" ? args.text : "";
  return {
    text,
  };
};

const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Record<string, unknown>
> = {
  get_current_time: getCurrentTime,
  echo,
};

export const LOCAL_CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description:
        "Get the current time at a specific UTC offset (for example +00:00 or -05:00).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          utc_offset: {
            type: "string",
            description: "UTC offset in the format +/-HH:MM.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "echo",
      description: "Echo back provided text exactly.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: {
          text: {
            type: "string",
            description: "Text to echo back.",
          },
        },
      },
    },
  },
];

export type LocalToolExecutionResult = {
  toolCallId: string;
  name: string;
  arguments: string;
  status: "success" | "error";
  result: string;
  message: ChatCompletionMessage;
};

const buildToolPayload = (
  ok: boolean,
  payload: Record<string, unknown>,
): string =>
  JSON.stringify(
    ok
      ? {
          ok: true,
          result: payload,
        }
      : {
          ok: false,
          error: payload.error ?? DEFAULT_TOOL_ERROR,
        },
  );

const executeToolCall = (toolCall: ChatCompletionToolCall): LocalToolExecutionResult => {
  const parsedArguments = parseToolArguments(toolCall.function.arguments ?? "");
  if (!parsedArguments.ok) {
    const content = buildToolPayload(false, { error: parsedArguments.error });
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments ?? "",
      status: "error",
      result: parsedArguments.error,
      message: {
        role: "tool",
        tool_call_id: toolCall.id,
        content,
      },
    };
  }

  const handler = toolHandlers[toolCall.function.name];
  if (!handler) {
    const error = `Unknown tool: ${toolCall.function.name}`;
    const content = buildToolPayload(false, { error });
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments ?? "",
      status: "error",
      result: error,
      message: {
        role: "tool",
        tool_call_id: toolCall.id,
        content,
      },
    };
  }

  try {
    const resultObject = handler(parsedArguments.value);
    const content = buildToolPayload(true, resultObject);
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments ?? "",
      status: "success",
      result: JSON.stringify(resultObject),
      message: {
        role: "tool",
        tool_call_id: toolCall.id,
        content,
      },
    };
  } catch {
    const content = buildToolPayload(false, { error: DEFAULT_TOOL_ERROR });
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments ?? "",
      status: "error",
      result: DEFAULT_TOOL_ERROR,
      message: {
        role: "tool",
        tool_call_id: toolCall.id,
        content,
      },
    };
  }
};

export const executeLocalToolCalls = async (
  toolCalls: ChatCompletionToolCall[],
): Promise<LocalToolExecutionResult[]> =>
  toolCalls.map((toolCall) => executeToolCall(toolCall));

export const toToolResultMessages = (results: LocalToolExecutionResult[]) =>
  results.map((result) => result.message);

export const toPendingToolInvocations = (
  toolCalls: ChatCompletionToolCall[],
): MessageToolInvocation[] =>
  toolCalls.map((toolCall) => ({
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: toolCall.function.arguments ?? "",
    status: "pending",
  }));

export const toCompletedToolInvocations = (
  results: LocalToolExecutionResult[],
): MessageToolInvocation[] =>
  results.map((result) => ({
    id: result.toolCallId,
    name: result.name,
    arguments: result.arguments,
    status: result.status,
    result: result.result,
  }));
