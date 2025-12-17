import hljs from 'highlight.js';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { Message } from '../types';
import { renderMarkdown } from '../utils';
import './ChatMessage.css';

type ChatMessageProps = {
  message: Message;
  isStreaming?: boolean;
};

const ChatMessage = ({ message, isStreaming = false }: ChatMessageProps) => {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const content = useMemo(() => {
    if (message.renderAsHtml) {
      return message.content;
    }
    return renderMarkdown(message.content);
  }, [message.content, message.renderAsHtml]);

  useEffect(() => {
    if (isStreaming) return;

    const container = bodyRef.current;
    if (!container) return;

    const preElements = Array.from(container.querySelectorAll('pre'));
    const cleanupTasks: Array<() => void> = [];

    preElements.forEach((pre) => {
      const codeElement = pre.querySelector('code');
      if (codeElement && !codeElement.classList.contains('hljs')) {
        hljs.highlightElement(codeElement as HTMLElement);
      }

      if (pre.querySelector('.copy-code-btn')) return;

      pre.classList.add('code-block');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code-btn';
      button.textContent = 'Copy Code';

      const handleClick = async () => {
        const codeContent = pre.querySelector('code')?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(codeContent);
          button.textContent = 'Copied!';
        } catch (error) {
          button.textContent = 'Copy failed';
        } finally {
          setTimeout(() => {
            button.textContent = 'Copy Code';
          }, 1500);
        }
      };

      button.addEventListener('click', handleClick);
      pre.insertBefore(button, pre.firstChild);

      cleanupTasks.push(() => {
        button.removeEventListener('click', handleClick);
      });
    });

    return () => {
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [content, isStreaming]);

  const ariaLabel = message.sender === 'user' ? 'User message' : 'Assistant message';

  return (
    <article className={`message message--${message.sender}`} aria-label={ariaLabel}>
      <div
        className="message__body"
        ref={bodyRef}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
};

export default memo(ChatMessage);
