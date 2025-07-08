"use client";
import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Message } from "../types";

import "highlight.js/styles/atom-one-dark.min.css";

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat container when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

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
              {
                role: "user",
                content: input,
                timestamp: new Date().toISOString(),
              },
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

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ role: "user", content: input }, assistantMsg]),
      }).catch((err) =>
        console.error("Failed to save assistant message:", err)
      );

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "assistant",
        content: "⚠️ Error: Failed to reach AI backend.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error("AI backend error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="container">
      <div className="chat-container" ref={chatContainerRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {msg.content}
            </Markdown>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
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
    </main>
  );
};
