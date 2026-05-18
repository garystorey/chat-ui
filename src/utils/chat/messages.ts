import type {
  ChatSummary,
  Message,
  ChatCompletionMessage,
} from "../../types";
import { getId } from "../shared/id";
import { getPlainTextFromHtml, normalizeWhitespace, truncate } from "../shared/text";
import { buildAttachmentContentParts } from "../transform/chat";
export {
  getChatCompletionContentText,
  stripAssistantArtifacts,
  buildChatCompletionResponse,
  extractAssistantReply,
  getAssistantChoice,
  extractAssistantToolCalls,
} from "../transform/chat";

export const cloneMessages = (items: Message[]): Message[] =>
  items.map((item) => ({
    ...item,
    ...(item.attachments
      ? {
          attachments: item.attachments.map((attachment) => ({
            ...attachment,
          })),
        }
      : {}),
    ...(item.toolInvocations
      ? {
          toolInvocations: item.toolInvocations.map((invocation) => ({
            ...invocation,
          })),
        }
      : {}),
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
    ? `Attachment${message.attachments.length > 1 ? "s" : ""} (${
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
    const attachmentContentParts = buildAttachmentContentParts(attachments);
    const hasAttachments = attachmentContentParts.length > 0;
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
            ...attachmentContentParts,
          ]
        : text ?? "";

    return {
      role: message.sender === "user" ? "user" : "assistant",
      content: contentParts,
    };
  });

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
