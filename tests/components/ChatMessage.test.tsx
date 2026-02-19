import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Message } from "../../src/types";
import ChatMessage from "../../src/components/ChatMessage";

afterEach(() => {
  cleanup();
});

const baseMessage: Message = {
  id: "msg-1",
  sender: "user",
  content: "Hello world",
};

describe("ChatMessage", () => {
  it("renders markdown content when renderAsHtml is not set", () => {
    const markdownMessage: Message = {
      ...baseMessage,
      id: "msg-markdown",
      content: "# Markdown heading",
    };

    render(<ChatMessage message={markdownMessage} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Markdown heading",
      }),
    ).toBeInTheDocument();
  });

  it("uses the provided html content when renderAsHtml is true", () => {
    const htmlMessage: Message = {
      ...baseMessage,
      id: "msg-html",
      renderAsHtml: true,
      content: "<strong>Trusted content</strong>",
    };

    render(<ChatMessage message={htmlMessage} />);

    expect(screen.getByText("Trusted content")).toBeInTheDocument();
  });

  it("renders tool invocation metadata when present", () => {
    const messageWithTool: Message = {
      ...baseMessage,
      id: "msg-tool",
      sender: "bot",
      content: "",
      toolInvocations: [
        {
          id: "tool-1",
          name: "echo",
          arguments: '{"text":"Hello"}',
          status: "success",
          result: '{"text":"Hello"}',
        },
      ],
    };

    render(<ChatMessage message={messageWithTool} />);

    expect(screen.getByText("echo")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getAllByText('{"text":"Hello"}')).toHaveLength(2);
  });
});
