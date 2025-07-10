"use client";
import React from "react";
import { List, Show, Thinking, ChatMessage, Button } from "../components";
import type { Message } from "../types";
import { useChat } from "../hooks/useChat";

export const Chat: React.FC = () => {
  const { messages, setInput, input, isTyping, chatContainerRef, sendMessage } =
    useChat();

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setInput(e.target.value);

  return (
    <main className="container">
      <div className="chat-container" ref={chatContainerRef}>
        <Show when={messages.length > 0}>
          <List<Message>
            className="chat-messages"
            items={messages}
            keyfield="timestamp"
            as={ChatMessage}
          />
          <Show when={isTyping}>
            <Thinking />
          </Show>
        </Show>

        <Show when={messages.length === 0}>
          <div className="chat-message assistant">
            <p>Welcome! How can I assist you today?</p>
          </div>
        </Show>
      </div>

      <div className="chat-input">
        <textarea
          rows={5}
          className="input-field"
          autoFocus
          spellCheck="true"
          autoComplete="off"
          autoCorrect="off"
          onChange={handleChange}
          placeholder="Type your message..."
          value={input}
          onKeyUp={handleKeyUp}
        />
        <div className="input-actions">
          <Button variant="standard" color="primary" onClick={sendMessage}>
            Send
          </Button>
          <Button variant="outline" color="primary">
            Attach
          </Button>
        </div>
      </div>
    </main>
  );
};
