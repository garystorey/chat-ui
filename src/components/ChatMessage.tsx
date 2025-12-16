import { memo, useMemo } from 'react';
import type { Message } from '../types';
import { renderMarkdown } from '../utils';
import './ChatMessage.css';

type ChatMessageProps = {
  message: Message;
};

const ChatMessage = ({ message }: ChatMessageProps) => {
  const content = useMemo(() => {
    if (message.renderAsHtml) {
      return message.content;
    }
    return renderMarkdown(message.content);
  }, [message.content, message.renderAsHtml]);

  const ariaLabel = message.sender === 'user' ? 'User message' : 'Assistant message';

  return (
    <article className={`message message--${message.sender}`} aria-label={ariaLabel}>
      <div className="message__body" dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
};

export default memo(ChatMessage);
