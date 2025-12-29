import type { ChatSummary, Message } from '../types';
import { buildChatPreview, getMessagePlainText } from './chat';

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
    preview: chat.preview,
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
      preview: chat.preview,
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

// Import functionality

export type ImportResult = {
  success: boolean;
  chats: ChatSummary[];
  errors: string[];
};

const isValidMessage = (msg: unknown): msg is Message => {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.sender === 'user' || m.sender === 'bot') &&
    typeof m.content === 'string'
  );
};

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeChat = (chat: unknown): ChatSummary | null => {
  if (typeof chat !== 'object' || chat === null) return null;

  const c = chat as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.title !== 'string') return null;

  const updatedAt = parseTimestamp(c.updatedAt);
  const messages = Array.isArray(c.messages) && c.messages.every(isValidMessage)
    ? (c.messages as Message[])
    : null;

  if (updatedAt === null || messages === null) return null;

  const preview = typeof c.preview === 'string'
    ? c.preview
    : buildChatPreview(messages[messages.length - 1], c.title);

  return {
    id: c.id,
    title: c.title,
    preview,
    updatedAt,
    messages,
  };
};

const validateSingleChatJSON = (data: unknown): ChatSummary | null => {
  return normalizeChat(data);
};

const validateMultipleChatsJSON = (data: unknown): ChatSummary[] => {
  if (Array.isArray(data)) {
    return data.map(normalizeChat).filter(Boolean) as ChatSummary[];
  }

  if (typeof data !== 'object' || data === null) return [];
  const d = data as Record<string, unknown>;

  if (Array.isArray(d.chats)) {
    return d.chats.map(normalizeChat).filter(Boolean) as ChatSummary[];
  }

  return [];
};

export const parseImportedJSON = (jsonString: string): ImportResult => {
  const errors: string[] = [];
  const chats: ChatSummary[] = [];

  try {
    const data = JSON.parse(jsonString);

    // Try to parse as single chat first
    const singleChat = validateSingleChatJSON(data);
    if (singleChat) {
      chats.push(singleChat);
      return { success: true, chats, errors };
    }

    // Try to parse as multiple chats
    const multipleChats = validateMultipleChatsJSON(data);
    if (multipleChats.length > 0) {
      chats.push(...multipleChats);
      return { success: true, chats, errors };
    }

    errors.push('Invalid JSON structure: Expected chat or chats array');
    return { success: false, chats: [], errors };
  } catch (error) {
    errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, chats: [], errors };
  }
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
};

export const importChatsFromFile = async (file: File): Promise<ImportResult> => {
  try {
    if (!file.name.endsWith('.json')) {
      return {
        success: false,
        chats: [],
        errors: ['Only JSON files are supported for import'],
      };
    }

    const content = await readFileAsText(file);
    return parseImportedJSON(content);
  } catch (error) {
    return {
      success: false,
      chats: [],
      errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};
