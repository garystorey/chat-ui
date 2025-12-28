import type { ChatSummary, Message } from '../types';
import { getMessagePlainText } from './chat';

export type ExportFormat = 'markdown' | 'json' | 'text';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMessageAsMarkdown = (message: Message): string => {
  const sender = message.sender === 'user' ? 'User' : 'Assistant';
  const content = getMessagePlainText(message);
  return `### ${sender}\n\n${content}\n`;
};

const formatMessageAsText = (message: Message): string => {
  const sender = message.sender === 'user' ? 'User' : 'Assistant';
  const content = getMessagePlainText(message);
  const separator = '-'.repeat(50);
  return `${separator}\n${sender}:\n${separator}\n\n${content}\n\n`;
};

export const exportChatAsMarkdown = (chat: ChatSummary): string => {
  const header = `# ${chat.title}\n\n**Last Updated:** ${formatDate(chat.updatedAt)}\n\n---\n\n`;
  const messages = chat.messages.map(formatMessageAsMarkdown).join('\n');
  return header + messages;
};

export const exportChatAsText = (chat: ChatSummary): string => {
  const header = `${chat.title}\nLast Updated: ${formatDate(chat.updatedAt)}\n\n${'='.repeat(70)}\n\n`;
  const messages = chat.messages.map(formatMessageAsText).join('');
  return header + messages;
};

export const exportChatAsJSON = (chat: ChatSummary): string => {
  const exportData = {
    title: chat.title,
    id: chat.id,
    updatedAt: chat.updatedAt,
    updatedAtFormatted: formatDate(chat.updatedAt),
    messages: chat.messages.map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      content: getMessagePlainText(msg),
    })),
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportAllChatsAsJSON = (chats: ChatSummary[]): string => {
  const exportData = {
    exportedAt: Date.now(),
    exportedAtFormatted: formatDate(Date.now()),
    totalChats: chats.length,
    chats: chats.map((chat) => ({
      title: chat.title,
      id: chat.id,
      updatedAt: chat.updatedAt,
      updatedAtFormatted: formatDate(chat.updatedAt),
      messages: chat.messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        content: getMessagePlainText(msg),
      })),
    })),
  };
  return JSON.stringify(exportData, null, 2);
};

const getMimeType = (format: ExportFormat): string => {
  const mimeTypes: Record<ExportFormat, string> = {
    markdown: 'text/markdown',
    json: 'application/json',
    text: 'text/plain',
  };
  return mimeTypes[format];
};

const getFileExtension = (format: ExportFormat): string => {
  const extensions: Record<ExportFormat, string> = {
    markdown: 'md',
    json: 'json',
    text: 'txt',
  };
  return extensions[format];
};

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9_\-\s]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
};

export const downloadFile = (
  content: string,
  filename: string,
  format: ExportFormat
): void => {
  const mimeType = getMimeType(format);
  const extension = getFileExtension(format);
  const sanitized = sanitizeFilename(filename);
  const fullFilename = `${sanitized}.${extension}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportChat = (chat: ChatSummary, format: ExportFormat): void => {
  let content: string;

  switch (format) {
    case 'markdown':
      content = exportChatAsMarkdown(chat);
      break;
    case 'json':
      content = exportChatAsJSON(chat);
      break;
    case 'text':
      content = exportChatAsText(chat);
      break;
    default:
      throw new Error(`Unknown export format: ${format}`);
  }

  downloadFile(content, chat.title, format);
};

export const exportAllChats = (
  chats: ChatSummary[],
  format: ExportFormat = 'json'
): void => {
  const timestamp = formatDate(Date.now()).replace(/[^a-z0-9]/gi, '-');
  const filename = `chat-history-${timestamp}`;

  if (format === 'json') {
    const content = exportAllChatsAsJSON(chats);
    downloadFile(content, filename, 'json');
  } else {
    throw new Error('Only JSON format is supported for exporting all chats');
  }
};
