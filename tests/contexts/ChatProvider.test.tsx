import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ChatProvider, useChat } from "../../src/contexts/ChatProvider";
import type { Message } from "../../src/types";

const TestConsumer: React.FC = () => {
  const { messages, addMessage, updateMessage, removeMessage } = useChat();

  return (
    <div>
      <div data-testid="count">{messages.length}</div>
      <button
        onClick={() =>
          addMessage({ id: "1", sender: "user", content: "hello" } as Message)
        }
      >
        add
      </button>
      <button onClick={() => updateMessage("1", { content: "updated" })}>
        update
      </button>
      <button onClick={() => removeMessage("1")}>remove</button>
      <div data-testid="content">{messages[0]?.content ?? ""}</div>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <ChatProvider>
      <TestConsumer />
    </ChatProvider>,
  );

describe("ChatProvider helpers", () => {
  it("adds, updates, and removes messages", async () => {
    renderWithProvider();
    const user = userEvent.setup();

    const count = () => screen.getByTestId("count");
    const content = () => screen.getByTestId("content");

    expect(count().textContent).toBe("0");

    await user.click(screen.getByText("add"));
    expect(count().textContent).toBe("1");
    expect(content().textContent).toBe("hello");

    await user.click(screen.getByText("update"));
    expect(content().textContent).toBe("updated");

    await user.click(screen.getByText("remove"));
    expect(count().textContent).toBe("0");
  });
});
