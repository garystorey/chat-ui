import type {
  ChatSummary,
  Message,
  ChatCompletionMessage,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ChatCompletionStreamResponse,
} from "../types";
import { getId } from "./id";
import { getPlainTextFromHtml, normalizeWhitespace, truncate } from "./text";

export const cloneMessages = (items: Message[]): Message[] =>
  items.map((item) => ({
    ...item,
  }));

export const getMessageTextContent = (message?: Message) => {
  if (!message) {
    return "";
  }

  return message.renderAsHtml
    ? getPlainTextFromHtml(message.content)
    : normalizeWhitespace(message.content);
};

export const getMessagePlainText = (message?: Message) => {
  if (!message) {
    return "";
  }

  const baseText = getMessageTextContent(message);
  const attachmentSummary = message.attachments?.length
    ? `Image attachment${message.attachments.length > 1 ? "s" : ""} (${
        message.attachments.length
      })`
    : "";

  if (baseText && attachmentSummary) {
    return `${baseText}\n${attachmentSummary}`;
  }

  return baseText || attachmentSummary;
};

export const toChatCompletionMessages = (
  messages: Message[],
): ChatCompletionMessage[] =>
  messages.map((message) => {
    const text = getMessageTextContent(message);
    const attachments = message.attachments ?? [];
    const attachmentUrls = attachments
      .map((attachment) => {
        const url = attachment.url.trim();
        if (!url) {
          return null;
        }

        const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
        const mimeType = attachment.mimeType || "image/png";

        if (url.startsWith("data:")) {
          const base64Part = url.split(",", 2)[1];
          if (base64Part && base64Pattern.test(base64Part)) {
            return `data:${mimeType};base64,${base64Part}`;
          }
        }

        if (base64Pattern.test(url)) {
          return `data:${mimeType};base64,${url}`;
        }

        console.warn(
          "Skipping non-base64 attachment url; expected base64 or data URL.",
          url,
        );
        return null;
      })
      .filter((url): url is string => Boolean(url));
    const hasAttachments = attachmentUrls.length > 0;
    const contentParts: ChatCompletionMessage["content"] =
      message.sender === "user" && hasAttachments
        ? [
            ...(text
              ? [
                  {
                    type: "text",
                    text,
                  } as const,
                ]
              : []),
            ...attachmentUrls.map(
              (url) =>
                ({
                  type: "image_url",
                  image_url: {
                    url,
                  },
                }) as const,
            ),
          ]
        : text ?? "";

    return {
      role: message.sender === "user" ? "user" : "assistant",
      content: contentParts,
    };
  });

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
  text.replace(/\s*<(?:begin_of_box|end_of_box)>\s*/g, "");

export const buildChatCompletionResponse = (
  chunks: ChatCompletionStreamResponse[],
): ChatCompletionResponse => {
  if (!chunks.length) {
    return { choices: [] };
  }

  const aggregated = new Map<number, ChatCompletionChoice>();

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
      if (choice.finish_reason !== undefined) {
        existing.finish_reason = choice.finish_reason;
      }

      aggregated.set(choice.index, existing);
    });
  });

  return {
    id: chunks[chunks.length - 1]?.id,
    choices: Array.from(aggregated.values()).sort((a, b) => a.index - b.index),
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

const buildChatText = (
  message: Message | undefined,
  fallback: string,
  maxLength: number,
) => {
  const text =
    getMessagePlainText(message) ||
    getPlainTextFromHtml(fallback) ||
    "Conversation";
  return truncate(text, maxLength) || "Conversation";
};

export const buildChatTitle = (message?: Message, fallback = "Conversation") =>
  buildChatText(message, fallback, 60);

export const buildChatPreview = (
  message?: Message,
  fallback = "Conversation",
) => buildChatText(message, fallback, 80);

export const createChatRecordFromMessages = (
  messages: Message[],
): ChatSummary => {
  const firstUserMessage = messages.find(
    (message) => message.sender === "user",
  );
  const lastMessage = messages[messages.length - 1];
  const title = buildChatTitle(firstUserMessage);
  const preview = buildChatPreview(lastMessage, title);

  return {
    id: getId(),
    title,
    preview,
    updatedAt: Date.now(),
    messages: cloneMessages(messages),
  };
};

export const sortChatsByUpdatedAt = (chats: ChatSummary[]) =>
  [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

export const upsertChatHistoryWithMessages = (
  chatHistory: ChatSummary[],
  chatId: string,
  messages: Message[],
  previewMessage?: Message,
): ChatSummary[] => {
  const previewCandidate = previewMessage ?? messages[messages.length - 1];
  const existingChat = chatHistory.find((chat) => chat.id === chatId);
  const updatedChat = existingChat
    ? {
        ...existingChat,
        preview: buildChatPreview(previewCandidate, existingChat.preview),
        updatedAt: Date.now(),
        messages: cloneMessages(messages),
      }
    : { ...createChatRecordFromMessages(messages), id: chatId };

  const nextHistory = existingChat
    ? chatHistory.map((chat) =>
        chat.id === updatedChat.id ? updatedChat : chat,
      )
    : [updatedChat, ...chatHistory];

  return sortChatsByUpdatedAt(nextHistory);
};
