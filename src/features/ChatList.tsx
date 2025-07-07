"use client";
import React, { useEffect, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const ChatList: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://192.168.31.208:1234/v1/chat/history", {
      headers: {
        "Content-Type": "application/json",
        // Add Authorization if needed
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch chat data");
        return res.json();
      })
      .then((data) => {
        // OpenAI compatible: expects { data: [ { role, content, ... } ] }
        setMessages(Array.isArray(data.data) ? data.data : []);
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
        {messages.map((msg, idx) => (
          <li key={idx}>
            <strong>{msg.role}:</strong> {msg.content}{" "}
            {msg.timestamp && <em>({msg.timestamp})</em>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
