import type {
  ChatSummary,
  Message,
  ChatCompletionMessage,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ChatCompletionContentPart,
  ChatCompletionStreamResponse,
} from '../types';
import { getId } from './id';
import { getPlainTextFromHtml, normalizeWhitespace, truncate } from './text';

export const cloneMessages = (items: Message[]): Message[] =>
  items.map((item) => ({
    ...item,
    ...(Array.isArray(item.attachments)
      ? {
          attachments: item.attachments.map((attachment) => ({ ...attachment })),
        }
      : {}),
  }));

export const getMessagePlainText = (message?: Message) => {
  if (!message) {
    return '';
  }

  if (message.renderAsHtml) {
    return getPlainTextFromHtml(message.content);
  }

  return normalizeWhitespace(message.content);
};

type ToChatCompletionMessagesOptions = {
  attachmentImageUrls?: Record<string, string>;
  omitAttachmentReferences?: boolean;
};

export const toChatCompletionMessages = (
  messages: Message[],
  options?: ToChatCompletionMessagesOptions
): ChatCompletionMessage[] =>
  messages.map((message) => {
    const text = getMessagePlainText(message);
    const isUserMessage = message.sender === 'user';
    const attachments =
      !options?.omitAttachmentReferences &&
      isUserMessage &&
      Array.isArray(message.attachments)
        ? message.attachments
        : [];

    const attachmentRefs = attachments.map((attachment) => ({ id: attachment.id }));
    const imageUrls = attachments
      .map((attachment) => options?.attachmentImageUrls?.[attachment.id])
      .filter((url): url is string => Boolean(url));

    if (isUserMessage && imageUrls.length) {
      const parts: ChatCompletionContentPart[] = [];

      if (text) {
        parts.push({ type: 'text', text });
      }

      imageUrls.forEach((url) =>
        parts.push({
          type: 'image_url',
          image_url: { url },
        })
      );

      if (!parts.length) {
        parts.push({ type: 'text', text: '' });
      }

      return {
        role: 'user',
        content: parts,
      };
    }

    const content: ChatCompletionContentPart[] = isUserMessage
      ? [
          {
            type: 'input_text',
            text: text ?? '',
            ...(attachmentRefs.length ? { attachments: attachmentRefs } : {}),
          },
        ]
      : [
          {
            type: 'text',
            text: text ?? '',
          },
        ];

    return {
      role: isUserMessage ? 'user' : 'assistant',
      content,
    };
  });

export const getChatCompletionContentText = (
  content: ChatCompletionMessage['content'] | undefined
) => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
};

export const buildChatCompletionResponse = (
  chunks: ChatCompletionStreamResponse[]
): ChatCompletionResponse => {
  if (!chunks.length) {
    return { choices: [] };
  }

  const aggregated = new Map<number, ChatCompletionChoice>();

  chunks.forEach((chunk) => {
    chunk.choices?.forEach((choice) => {
      const existing = aggregated.get(choice.index) ?? {
        index: choice.index,
        message: { role: 'assistant', content: '' },
        finish_reason: null,
      };

      if (choice.delta?.role) {
        existing.message.role = choice.delta.role;
      }
      if (choice.delta?.content) {
        const deltaText = getChatCompletionContentText(choice.delta.content);
        if (deltaText) {
          existing.message.content = `${existing.message.content ?? ''}${deltaText}`;
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
    return '';
  }

  const assistantChoice = response.choices.find(
    (choice: ChatCompletionChoice) => choice.message.role === 'assistant'
  );
  const content = getChatCompletionContentText(assistantChoice?.message?.content);
  return content.trim();
};

export const buildChatTitle = (
  message?: Message,
  fallback = 'Conversation'
) =>
  truncate(
    getMessagePlainText(message) || getPlainTextFromHtml(fallback) || 'Conversation',
    60
  ) || 'Conversation';

export const buildChatPreview = (
  message?: Message,
  fallback = 'Conversation'
) =>
  truncate(
    getMessagePlainText(message) || getPlainTextFromHtml(fallback) || 'Conversation',
    80
  ) || 'Conversation';

export const createChatRecordFromMessages = (messages: Message[]): ChatSummary => {
  const firstUserMessage = messages.find((message) => message.sender === 'user');
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
