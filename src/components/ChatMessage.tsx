import hljs from "highlight.js";
import { memo, useEffect, useMemo, useRef } from "react";
import type { Message } from "../types";
import { renderMarkdown } from "../utils";
import "./ChatMessage.css";

const copyIcon = `
  <svg
    class="copy-code-btn__icon"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
`;

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
  const attachments = message.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const hasContent = message.content.trim().length > 0;

  useEffect(() => {
    if (isStreaming) return;

    const container = bodyRef.current;
    if (!container) return;

    const preElements = Array.from(container.querySelectorAll("pre"));
    const cleanupTasks: Array<() => void> = [];

    preElements.forEach((pre) => {
      const codeElement = pre.querySelector("code");
      if (codeElement && !codeElement.classList.contains("hljs")) {
        hljs.highlightElement(codeElement as HTMLElement);
      }

      const existingButton =
        pre.querySelector<HTMLButtonElement>(".copy-code-btn");

      pre.classList.add("code-block");
      const button = existingButton ?? document.createElement("button");
      button.type = "button";
      button.className = "copy-code-btn";
      button.dataset.status = "idle";
      button.setAttribute("aria-live", "polite");
      button.innerHTML = `${copyIcon}<span class="sr-only">Copy code</span>`;

      const label = button.querySelector<HTMLSpanElement>(".sr-only");

      const updateLabel = (
        text: string,
        status: "idle" | "copied" | "error",
      ) => {
        if (label) {
          label.textContent = text;
        }

        button.setAttribute("aria-label", text);
        button.dataset.status = status;
      };

      updateLabel("Copy code", "idle");

      const handleClick = async () => {
        const codeContent =
          pre.querySelector("code")?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(codeContent);
          updateLabel("Copied!", "copied");
        } catch (error) {
          updateLabel("Copy failed", "error");
        } finally {
          setTimeout(() => {
            updateLabel("Copy code", "idle");
          }, 1500);
        }
      };

      button.addEventListener("click", handleClick);
      if (!existingButton) {
        pre.insertBefore(button, pre.firstChild);
      }

      cleanupTasks.push(() => {
        button.removeEventListener("click", handleClick);
      });
    });

    return () => {
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [content, isStreaming]);

  const ariaLabel =
    message.sender === "user" ? "User message" : "Assistant message";

  return (
    <article
      className={`message message--${message.sender}`}
      aria-label={ariaLabel}
    >
      {hasContent && (
        <div
          className="message__body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
      {hasAttachments && (
        <div className="message__attachments" aria-label="Message attachments">
          {attachments.map((attachment) => (
            <figure key={attachment.id} className="message__attachment">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="message__attachment-image"
                loading="lazy"
              />
              <figcaption className="message__attachment-caption">
                {attachment.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </article>
  );
};

export default memo(ChatMessage);
