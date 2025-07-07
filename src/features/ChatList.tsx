"use client";
import React, { useEffect, useState } from "react";

interface Message {
  id?: number;
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

const ChatList: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch chat data");
        return res.json();
      })
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading chat data...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!messages.length) return <div>No chat data available.</div>;

  return (
    <div className="chat-list" style={{ marginTop: 32 }}>
      <h2>All Chat Data</h2>
      <ul>
        {messages.map((msg) => (
          <li key={msg.id || msg.timestamp}>
            <strong>{msg.role}:</strong> {msg.message}{" "}
            <em>({msg.timestamp})</em>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
