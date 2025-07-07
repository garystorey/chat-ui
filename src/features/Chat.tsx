"use client";
import React, { useState, useEffect } from "react";

// Add Message type locally since we no longer import from store
interface Message {
  id?: number;
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

interface ChatProps {}

export const Chat: React.FC<ChatProps> = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => setMessages(data));
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const timestamp = new Date().toISOString();
    const userMsg: Message = { role: "user", message: input, timestamp };
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userMsg),
    });
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await fetch(
        "http://192.168.86.31:1234/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer sk-local",
          },
          body: JSON.stringify({
            messages,
            temperature: 0.7,
          }),
        }
      );

      const result = await response.json();
      const reply =
        result.choices?.[0]?.message?.content?.trim() || "[No response]";

      const assistantMsg: Message = {
        role: "assistant",
        message: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "assistant",
        message: "⚠️ Error: Failed to reach AI backend.",
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
            {msg.message}
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
