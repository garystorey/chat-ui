import { describe, it, expect } from "vitest";
import { createChatHistoryService } from "../../src/services/chatHistory.ts";
import type { ChatSummary } from "../../src/types/index.ts";

const KEY = "chatHistory";

describe("ChatHistoryService (in-memory adapter)", () => {
  it("load returns empty when no data", () => {
    const store = new Map<string, string>();
    const adapter = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };

    const svc = createChatHistoryService(adapter);
    const loaded = svc.load();
    expect(loaded).toEqual([]);
  });

  it("save and load roundtrip", () => {
    const store = new Map<string, string>();
    const adapter = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };

    const svc = createChatHistoryService(adapter);

    const chat: ChatSummary = {
      id: "abc",
      title: "Test",
      preview: "preview",
      updatedAt: Date.now(),
      messages: [],
    };

    svc.save([chat]);
    const raw = adapter.getItem(KEY);
    expect(raw).toBeDefined();
    const loaded = svc.load();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe("abc");
  });

  it("save throws when adapter.setItem throws", () => {
    const adapter = {
      getItem: (_k: string) => null,
      setItem: (_k: string, _v: string) => {
        throw new Error("fail");
      },
    } as any;

    const svc = createChatHistoryService(adapter);
    expect(() => svc.save([])).toThrow();
  });
});
