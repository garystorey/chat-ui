import { useState, useRef, useEffect } from "react";
import type { Message } from "../types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
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

      setMessages((prev) => [...prev, assistantMsg]);

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          { role: "user", content: input.trim() },
          assistantMsg,
        ]),
      }).catch((err) =>
        console.error("Failed to save assistant message:", err)
      );
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

  return {
    messages,
    setMessages,
    input,
    setInput,
    isTyping,
    setIsTyping,
    chatContainerRef,
    sendMessage,
  };
}
