import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ChatListItem from "../../src/components/ChatListItem";
import type { PreviewChat } from "../../src/types";

afterEach(() => {
  cleanup();
});

const chat: PreviewChat = {
  id: "chat-1",
  title: "First conversation",
  preview: "How are you?",
};

describe("ChatListItem", () => {
  it("applies the active class when the chat matches the active id", () => {
    const { container } = render(
      <ChatListItem
        chat={chat}
        activeChatId={chat.id}
        onSelectChat={vi.fn()}
        onRemoveChat={vi.fn()}
        onRenameChat={vi.fn()}
      />,
    );

    expect(container.querySelector(".sidebar__chat--active")).not.toBeNull();
  });

  it("invokes the selection callback when the chat is clicked", () => {
    const onSelectChat = vi.fn();

    render(
      <ChatListItem
        chat={chat}
        activeChatId={null}
        onSelectChat={onSelectChat}
        onRemoveChat={vi.fn()}
        onRenameChat={vi.fn()}
      />,
    );

    const chatButton = screen.getByRole("button", {
      name: (name) => name.startsWith(chat.title),
    });

    fireEvent.click(chatButton);

    expect(onSelectChat).toHaveBeenCalledWith(chat.id);
  });

  it("only invokes the remove callback when the remove button is clicked", () => {
    const onSelectChat = vi.fn();
    const onRemoveChat = vi.fn();

    render(
      <ChatListItem
        chat={chat}
        activeChatId={null}
        onSelectChat={onSelectChat}
        onRemoveChat={onRemoveChat}
        onRenameChat={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Remove ${chat.title}` }),
    );

    expect(onRemoveChat).toHaveBeenCalledWith(chat.id);
    expect(onSelectChat).not.toHaveBeenCalled();
  });
});
