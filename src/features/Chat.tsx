"use client";
import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ChatStore } from "../store";
import { Message } from "../types";

import "highlight.js/styles/atom-one-dark.min.css";

const store = new ChatStore();

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    store.save(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await fetch(
        "http://192.168.86.31:1234/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add Authorization if needed
          },
          body: JSON.stringify({
            messages: [
              ...messages.map(({ role, content }) => ({ role, content })),
              { role: "user", content: input },
            ],
            temperature: 0.7,
          }),
        }
      );

      const result = await response.json();
      const reply =
        result.choices?.[0]?.message?.content?.trim() || "[No response]";

      const assistantMsg: Message = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      store.save(assistantMsg);

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "assistant",
        content: "⚠️ Error: Failed to reach AI backend.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error("AI backend error:", err);
    }
  };

  return (
    <div className="container">
      <div className="chat-container">
        {messages.map((msg, idx) => (
          <p key={idx} className={`chat-message ${msg.role}`}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {msg.content}
            </Markdown>
          </p>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          rows={5}
          className="input-field"
          autoFocus
          spellCheck="true"
          autoComplete="off"
          autoCorrect="off"
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          value={input}
          onKeyUp={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="input-actions">
          <button onClick={handleSend}>Send</button>
          <button>Attach</button>
        </div>
      </div>
    </div>
  );
};
