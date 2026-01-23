import { describe, expect, it, vi } from "vitest";
import {
  exportAllChatsAsJSON,
  exportChatAsJSON,
  serializeChat,
} from "../../src/utils/export";
import type { ChatSummary } from "../../src/types";

const buildChat = (id: string, updatedAt: number): ChatSummary => ({
  id,
  title: `Chat ${id}`,
  preview: "Preview",
  updatedAt,
  messages: [
    {
      id: `msg-${id}`,
      sender: "user",
      content: "Hello",
      renderAsHtml: false,
    },
  ],
});

describe("export helpers", () => {
  it("serializes a chat and includes formatted timestamps", () => {
    const chat = buildChat("1", new Date("2024-01-02T03:04:00Z").getTime());

    const json = exportChatAsJSON(chat);
    const parsed = JSON.parse(json) as ReturnType<typeof serializeChat>;

    expect(parsed.id).toBe(chat.id);
    expect(parsed.updatedAt).toBe(chat.updatedAt);
    expect(parsed.updatedAtFormatted).toContain("2024");
    expect(parsed.messages).toHaveLength(1);
  });

  it("exports all chats with summary metadata", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-01T08:00:00Z"));

    const chats = [buildChat("1", Date.now()), buildChat("2", Date.now())];
    const json = exportAllChatsAsJSON(chats);
    const parsed = JSON.parse(json) as {
      exportedAt: number;
      totalChats: number;
      chats: ReturnType<typeof serializeChat>[];
    };

    expect(parsed.totalChats).toBe(2);
    expect(parsed.exportedAt).toBe(Date.now());
    expect(parsed.chats).toHaveLength(2);

    vi.useRealTimers();
  });
});
