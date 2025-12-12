import { describe, expect, it, vi } from 'vitest';
import {
  cloneMessages,
  getMessagePlainText,
  toChatCompletionMessages,
  getChatCompletionContentText,
  extractAssistantReply,
  buildChatTitle,
  buildChatPreview,
  createChatRecordFromMessages,
} from '../../src/utils/chat';
import type { Message, ChatCompletionResponse } from '../../src/types';

vi.mock('../../src/utils/id', () => ({
  getId: vi.fn(() => 'chat-id'),
}));

describe('chat utilities', () => {
  it('deep clones messages including nested attachments', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'user',
        content: 'Hi',
        attachments: [{ id: 'a', name: 'file', size: 1, type: 'text/plain' }],
      },
    ];

    const clone = cloneMessages(messages);

    expect(clone).not.toBe(messages);
    expect(clone[0]).not.toBe(messages[0]);
    expect(clone[0].attachments![0]).not.toBe(messages[0].attachments![0]);

    clone[0].attachments![0].name = 'changed';
    expect(messages[0].attachments![0].name).toBe('file');
  });

  it('derives plain text from HTML content and normalizes whitespace', () => {
    const message: Message = {
      id: '2',
      sender: 'user',
      content: '<strong>Hello</strong>    world',
      renderAsHtml: true,
    };

    expect(getMessagePlainText(message)).toBe('Hello world');
    expect(getMessagePlainText(undefined)).toBe('');
  });

  it('transforms messages into chat completion payloads with attachments', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'user',
        content: 'Hello',
        attachments: [
          { id: 'att-1', name: 'first', size: 1, type: 'text/plain' },
        ],
      },
      { id: '2', sender: 'bot', content: 'Hi there' },
    ];

    const completionMessages = toChatCompletionMessages(messages);

    expect(completionMessages).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Hello',
            attachments: [{ id: 'att-1' }],
          },
        ],
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hi there',
          },
        ],
      },
    ]);
  });

  it('adds image_url parts when attachment URLs are provided', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'user',
        content: 'Check this image',
        attachments: [
          { id: 'img-1', name: 'photo', size: 1, type: 'image/png' },
        ],
      },
    ];

    const completionMessages = toChatCompletionMessages(messages, {
      attachmentImageUrls: { 'img-1': 'data:image/png;base64,abc123' },
    });

    expect(completionMessages).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Check this image',
            attachments: [{ id: 'img-1' }],
          },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,abc123' },
          },
        ],
      },
    ]);
  });

  it('retains non-image attachment references alongside image parts', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'user',
        content: 'Mixed files',
        attachments: [
          { id: 'img-1', name: 'photo', size: 1, type: 'image/png' },
          { id: 'doc-1', name: 'doc', size: 2, type: 'application/pdf' },
        ],
      },
    ];

    const completionMessages = toChatCompletionMessages(messages, {
      attachmentImageUrls: { 'img-1': 'data:image/png;base64,abc123' },
    });

    expect(completionMessages).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Mixed files',
            attachments: [{ id: 'img-1' }, { id: 'doc-1' }],
          },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,abc123' },
          },
        ],
      },
    ]);
  });

  it('omits attachment references when requested', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'user',
        content: 'No refs',
        attachments: [
          { id: 'att-1', name: 'first', size: 1, type: 'text/plain' },
        ],
      },
    ];

    const completionMessages = toChatCompletionMessages(messages, {
      omitAttachmentReferences: true,
    });

    expect(completionMessages).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'No refs',
          },
        ],
      },
    ]);
  });

  it('collects content from completion messages regardless of shape', () => {
    expect(getChatCompletionContentText('ready')).toBe('ready');
    expect(
      getChatCompletionContentText([
        { type: 'text', text: 'foo' },
        { type: 'output_text', text: 'bar' },
      ])
    ).toBe('foobar');
  });

  it('extracts trimmed assistant replies and falls back to an empty string', () => {
    const response: ChatCompletionResponse = {
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: ' Done ' },
            ],
          },
        },
      ],
    };

    expect(extractAssistantReply(response)).toBe('Done');
    expect(extractAssistantReply({ choices: [] })).toBe('');
  });

  it('builds chat titles and previews from message content and fallbacks', () => {
    const message: Message = { id: '1', sender: 'user', content: 'A'.repeat(100) };
    const title = buildChatTitle(message);
    const preview = buildChatPreview(message);

    expect(title.length).toBeLessThanOrEqual(60);
    expect(preview.length).toBeLessThanOrEqual(80);
    expect(buildChatTitle(undefined)).toBe('Conversation');
  });

  it('creates a chat summary with cloned messages and metadata', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const messages: Message[] = [
      { id: '1', sender: 'user', content: 'Hello' },
      { id: '2', sender: 'bot', content: 'Hi!' },
    ];

    const chat = createChatRecordFromMessages(messages);

    expect(chat).toMatchObject({
      id: 'chat-id',
      title: expect.stringContaining('Hello'),
      preview: expect.stringContaining('Hi!'),
      updatedAt: 1700000000000,
    });
    expect(chat.messages).not.toBe(messages);
    expect(chat.messages).toEqual(messages);

    nowSpy.mockRestore();
  });
});
