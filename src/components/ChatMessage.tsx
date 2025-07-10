import Markdown from "markdown-to-jsx";
import type { Message } from "../types";

export const ChatMessage = ({ role, content }: Message) => (
  <span className={`chat-message ${role}`}>
    <Markdown options={{ forceBlock: true }}>{content}</Markdown>
  </span>
);

export default ChatMessage;
