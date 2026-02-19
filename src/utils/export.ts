import type { ChatSummary, Message } from "../types";
import { buildChatPreview, getMessagePlainText } from "./chat";

export type ExportFormat = "markdown" | "json" | "text";

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMessageExportDetails = (
  message: Message,
): { senderLabel: string; content: string } => {
  const senderLabel = message.sender === "user" ? "User" : "Assistant";
  const content = getMessagePlainText(message);
  return { senderLabel, content };
};

const formatMessageAsMarkdown = (message: Message): string => {
  const { senderLabel, content } = getMessageExportDetails(message);
  return `### ${senderLabel}\n\n${content}\n`;
};

const formatMessageAsText = (message: Message): string => {
  const { senderLabel, content } = getMessageExportDetails(message);
  const separator = "-".repeat(50);
  return `${separator}\n${senderLabel}:\n${separator}\n\n${content}\n\n`;
};

export const exportChatAsMarkdown = (chat: ChatSummary): string => {
  const header = `# ${chat.title}\n\n**Last Updated:** ${formatDate(chat.updatedAt)}\n\n---\n\n`;
  const messages = chat.messages.map(formatMessageAsMarkdown).join("\n");
  return header + messages;
};

export const exportChatAsText = (chat: ChatSummary): string => {
  const header = `${chat.title}\nLast Updated: ${formatDate(chat.updatedAt)}\n\n${"=".repeat(70)}\n\n`;
  const messages = chat.messages.map(formatMessageAsText).join("");
  return header + messages;
};

export const serializeMessage = (msg: Message) => ({
  id: msg.id,
  sender: msg.sender,
  content: msg.content,
  ...(msg.attachments ? { attachments: msg.attachments } : {}),
  ...(msg.toolInvocations ? { toolInvocations: msg.toolInvocations } : {}),
  ...(msg.renderAsHtml ? { renderAsHtml: true } : {}),
});

export const serializeChat = (chat: ChatSummary) => ({
  title: chat.title,
  id: chat.id,
  preview: chat.preview,
  updatedAt: chat.updatedAt,
  updatedAtFormatted: formatDate(chat.updatedAt),
  messages: chat.messages.map(serializeMessage),
});

export const exportChatAsJSON = (chat: ChatSummary): string => {
  const exportData = serializeChat(chat);
  return JSON.stringify(exportData, null, 2);
};

export const exportAllChatsAsJSON = (chats: ChatSummary[]): string => {
  const exportedAt = Date.now();
  const exportData = {
    exportedAt,
    exportedAtFormatted: formatDate(exportedAt),
    totalChats: chats.length,
    chats: chats.map(serializeChat),
  };
  return JSON.stringify(exportData, null, 2);
};

const FORMAT_CONFIG: Record<
  ExportFormat,
  { mimeType: string; extension: string }
> = {
  markdown: { mimeType: "text/markdown", extension: "md" },
  json: { mimeType: "application/json", extension: "json" },
  text: { mimeType: "text/plain", extension: "txt" },
};

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9_\-\s]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 50);
};

export const downloadFile = (
  content: string,
  filename: string,
  format: ExportFormat,
  fallbackName = "conversation",
): void => {
  const { mimeType, extension } = FORMAT_CONFIG[format];
  const sanitized = sanitizeFilename(filename);
  const safeBaseName = sanitized || sanitizeFilename(fallbackName) || "download";
  const fullFilename = `${safeBaseName}.${extension}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fullFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportChat = (chat: ChatSummary, format: ExportFormat): void => {
  const formatters: Record<ExportFormat, (data: ChatSummary) => string> = {
    markdown: exportChatAsMarkdown,
    json: exportChatAsJSON,
    text: exportChatAsText,
  };
  const formatter = formatters[format];
  const content = formatter(chat);

  downloadFile(content, chat.title, format);
};

export const exportAllChats = (chats: ChatSummary[]): void => {
  const timestamp = formatDate(Date.now()).replace(/[^a-z0-9]/gi, "-");
  const filename = `chat-history-${timestamp}`;
  const content = exportAllChatsAsJSON(chats);
  downloadFile(content, filename, "json", "chat-history");
};

// Import functionality

export type ImportResult = {
  success: boolean;
  chats: ChatSummary[];
  errors: string[];
};

const isValidMessage = (msg: unknown): msg is Message => {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.sender === "user" || m.sender === "bot") &&
    typeof m.content === "string" &&
    (m.attachments === undefined ||
      (Array.isArray(m.attachments) &&
        m.attachments.every((attachment) => {
          if (typeof attachment !== "object" || attachment === null) {
            return false;
          }
          const a = attachment as Record<string, unknown>;
          return (
            typeof a.id === "string" &&
            (a.type === "image" || a.type === "file") &&
            typeof a.name === "string" &&
            typeof a.mimeType === "string" &&
            typeof a.size === "number" &&
            typeof a.url === "string"
          );
        }))) &&
    (m.toolInvocations === undefined ||
      (Array.isArray(m.toolInvocations) &&
        m.toolInvocations.every((invocation) => {
          if (typeof invocation !== "object" || invocation === null) {
            return false;
          }
          const i = invocation as Record<string, unknown>;
          return (
            typeof i.id === "string" &&
            typeof i.name === "string" &&
            typeof i.arguments === "string" &&
            (i.status === "pending" ||
              i.status === "running" ||
              i.status === "success" ||
              i.status === "error") &&
            (i.result === undefined || typeof i.result === "string")
          );
        }))) &&
    (m.renderAsHtml === undefined || typeof m.renderAsHtml === "boolean")
  );
};

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeChat = (chat: unknown): ChatSummary | null => {
  if (typeof chat !== "object" || chat === null) return null;

  const c = chat as Record<string, unknown>;
  if (typeof c.id !== "string" || typeof c.title !== "string") return null;

  const updatedAt = parseTimestamp(c.updatedAt);
  const messages =
    Array.isArray(c.messages) && c.messages.every(isValidMessage)
      ? (c.messages as Message[]).map((message) => ({
          ...message,
          renderAsHtml: message.renderAsHtml ?? false,
        }))
      : null;

  if (updatedAt === null || messages === null) return null;

  const preview =
    typeof c.preview === "string"
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

export const parseChatPayload = (data: unknown): ChatSummary[] => {
  const singleChat = normalizeChat(data);
  if (singleChat) return [singleChat];

  if (Array.isArray(data)) {
    return data.map(normalizeChat).filter(Boolean) as ChatSummary[];
  }

  if (typeof data !== "object" || data === null) return [];
  const payload = data as Record<string, unknown>;

  if (Array.isArray(payload.chats)) {
    return payload.chats
      .map(normalizeChat)
      .filter(Boolean) as ChatSummary[];
  }

  return [];
};

export const parseImportedJSON = (jsonString: string): ImportResult => {
  const errors: string[] = [];
  const chats: ChatSummary[] = [];

  try {
    const data = JSON.parse(jsonString);

    const parsedChats = parseChatPayload(data);
    if (parsedChats.length > 0) {
      chats.push(...parsedChats);
      return { success: true, chats, errors };
    }

    errors.push("Invalid JSON structure: Expected chat or chats array");
    return { success: false, chats: [], errors };
  } catch (error) {
    errors.push(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return { success: false, chats: [], errors };
  }
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsText(file);
  });
};

export const importChatsFromFile = async (
  file: File,
): Promise<ImportResult> => {
  try {
    if (!file.name.endsWith(".json")) {
      return {
        success: false,
        chats: [],
        errors: ["Only JSON files are supported for import"],
      };
    }

    const content = await readFileAsText(file);
    return parseImportedJSON(content);
  } catch (error) {
    return {
      success: false,
      chats: [],
      errors: [
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
};
