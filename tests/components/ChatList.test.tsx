import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ChatList from "../../src/components/ChatList";
import type { PreviewChat } from "../../src/types";

afterEach(() => {
  cleanup();
});

const buildChat = (id: number): PreviewChat => ({
  id: `chat-${id}`,
  title: `Chat ${id}`,
  preview: `Preview ${id}`,
});

describe("ChatList", () => {
  it("renders a chat item for each provided chat", () => {
    const chats = [buildChat(1), buildChat(2)];

    render(
      <ChatList
        chats={chats}
        activeChatId={null}
        onSelectChat={vi.fn()}
        onRemoveChat={vi.fn()}
        onRenameChat={vi.fn()}
      />,
    );

    expect(screen.queryByText("No chats found")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(chats.length);
    chats.forEach((chat) => {
      expect(screen.getByText(chat.title)).toBeInTheDocument();
      expect(screen.getByText(chat.preview)).toBeInTheDocument();
    });
  });

  it("renders the empty state when there are no chats", () => {
    render(
      <ChatList
        chats={[]}
        activeChatId={null}
        onSelectChat={vi.fn()}
        onRemoveChat={vi.fn()}
        onRenameChat={vi.fn()}
      />,
    );

    expect(screen.getByText("No chats found")).toBeInTheDocument();
  });
});
