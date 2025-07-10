import { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Message } from "../types";

export const ChatMessage = ({ role, content }: Message) => (
  <div className={`chat-message ${role}`}>
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {content}
    </Markdown>
  </div>
);

export default ChatMessage;
