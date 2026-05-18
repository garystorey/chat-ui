import type {
  MessageAttachment,
  ChatCompletionContentPart,
  ChatCompletionStreamResponse,
  ChatCompletionChoice,
  ChatCompletionResponse,
  ChatCompletionMessage,
  ChatCompletionToolCall,
} from "../../types";
import { getPlainTextFromHtml } from "../text";

const DEFAULT_MIME_TYPE = "application/octet-stream";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

const toDataUrl = (url: string, mimeType: string) => {
  if (url.startsWith("data:")) {
    return url;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (base64Pattern.test(url)) {
    return `data:${mimeType || DEFAULT_MIME_TYPE};base64,${url}`;
  }

  return null;
};

const buildImageUrl = (attachment: MessageAttachment) => {
  const url = attachment.url.trim();
  if (!url) {
    return null;
  }

  const dataUrl = toDataUrl(url, attachment.mimeType || "image/png");
  if (dataUrl) {
    return dataUrl;
  }

  console.warn(
    "Skipping attachment url; expected base64, data URL, or http(s) URL.",
    url,
  );
  return null;
};

export const buildAttachmentContentParts = (attachments: MessageAttachment[]) => {
  const parts: ChatCompletionContentPart[] = [];

  attachments.forEach((attachment) => {
    if (attachment.type === "image" || attachment.mimeType.startsWith("image/")) {
      if (
        attachment.mimeType &&
        attachment.mimeType.startsWith("image/") &&
        !ALLOWED_IMAGE_MIME_TYPES.has(attachment.mimeType)
      ) {
        console.warn(
          "Skipping unsupported image attachment mime type.",
          attachment.mimeType,
        );
        return;
      }

      const url = buildImageUrl(attachment);
      if (!url) {
        return;
      }
      parts.push({
        type: "image_url",
        image_url: {
          url,
        },
      });
      return;
    }

    const dataUrl =
      toDataUrl(attachment.url, attachment.mimeType || DEFAULT_MIME_TYPE) ??
      attachment.url;
    parts.push({
      type: "text",
      text: `Attachment: ${attachment.name} (${attachment.mimeType || DEFAULT_MIME_TYPE}, ${attachment.size} bytes)\nData: ${dataUrl}`,
    });
  });

  return parts;
};

export const getChatCompletionContentText = (
  content: ChatCompletionMessage["content"] | undefined,
) => {
  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) =>
      "text" in part && typeof part.text === "string" ? part.text : "",
    )
    .join("");
};

export const stripAssistantArtifacts = (text: string) =>
  text.replace(/\s*<\|?(?:begin_of_box|end_of_box)\|?>\s*/g, "");

export const buildChatCompletionResponse = (
  chunks: ChatCompletionStreamResponse[],
): ChatCompletionResponse => {
  if (!chunks.length) {
    return { choices: [] };
  }

  const aggregated = new Map<number, ChatCompletionChoice>();
  const toolCallsByChoice = new Map<number, Map<number, ChatCompletionToolCall>>();

  chunks.forEach((chunk) => {
    chunk.choices?.forEach((choice) => {
      const existing = aggregated.get(choice.index) ?? {
        index: choice.index,
        message: { role: "assistant", content: "" },
        finish_reason: null,
      };

      if (choice.delta?.role) {
        existing.message.role = choice.delta.role;
      }
      if (choice.delta?.content) {
        const deltaText = getChatCompletionContentText(choice.delta.content);
        if (deltaText) {
          existing.message.content = `${existing.message.content ?? ""}${deltaText}`;
        }
      }
      if (choice.delta?.tool_calls?.length) {
        const indexedToolCalls =
          toolCallsByChoice.get(choice.index) ?? new Map<number, ChatCompletionToolCall>();

        choice.delta.tool_calls.forEach((toolCallDelta) => {
          const existingToolCall = indexedToolCalls.get(toolCallDelta.index) ?? {
            id: toolCallDelta.id ?? `tool-call-${choice.index}-${toolCallDelta.index}`,
            type: "function",
            function: {
              name: "",
              arguments: "",
            },
          };

          if (toolCallDelta.id) {
            existingToolCall.id = toolCallDelta.id;
          }
          if (toolCallDelta.type) {
            existingToolCall.type = toolCallDelta.type;
          }
          if (toolCallDelta.function?.name) {
            existingToolCall.function.name = toolCallDelta.function.name;
          }
          if (typeof toolCallDelta.function?.arguments === "string") {
            existingToolCall.function.arguments += toolCallDelta.function.arguments;
          }

          indexedToolCalls.set(toolCallDelta.index, existingToolCall);
        });

        toolCallsByChoice.set(choice.index, indexedToolCalls);
      }
      if (choice.finish_reason !== undefined) {
        existing.finish_reason = choice.finish_reason;
      }

      aggregated.set(choice.index, existing);
    });
  });

  const choices = Array.from(aggregated.values())
    .sort((a, b) => a.index - b.index)
    .map((choice) => {
      const indexedToolCalls = toolCallsByChoice.get(choice.index);
      if (indexedToolCalls?.size) {
        const toolCalls = Array.from(indexedToolCalls.entries())
          .sort(([left], [right]) => left - right)
          .map(([, call]) => call);

        choice.message.tool_calls = toolCalls;
      }

      if (
        choice.finish_reason === "tool_calls" &&
        !getChatCompletionContentText(choice.message.content)
      ) {
        choice.message.content = null;
      }

      return choice;
    });

  return {
    id: chunks[chunks.length - 1]?.id,
    choices,
  };
};

export const extractAssistantReply = (response: ChatCompletionResponse) => {
  if (!response?.choices?.length) {
    return "";
  }

  const assistantChoice = response.choices.find(
    (choice: ChatCompletionChoice) => choice.message.role === "assistant",
  );
  const content = getChatCompletionContentText(
    assistantChoice?.message?.content,
  );
  return stripAssistantArtifacts(content).trim();
};

export const getAssistantChoice = (response: ChatCompletionResponse) =>
  response?.choices?.find(
    (choice: ChatCompletionChoice) => choice.message.role === "assistant",
  );

export const extractAssistantToolCalls = (
  response: ChatCompletionResponse,
) => getAssistantChoice(response)?.message?.tool_calls ?? [];

export default {} as const;
