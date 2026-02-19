import { memo, useRef } from "react";
import type { Message } from "../types";
import {
  useChatLogLiveRegion,
  usePrefersReducedMotion,
  useScrollToBottom,
} from "../hooks";
import {
  Heading,
  ThinkingIndicator,
  ChatMessage,
  Show,
  List,
} from "../components";

import "./ChatWindow.css";

type ChatWindowProps = {
  messages: Message[];
  isResponding: boolean;
};

const ChatWindow = ({ messages, isResponding }: ChatWindowProps) => {
  const messagesRef = useRef<HTMLUListElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldHidePendingAssistant =
    isResponding &&
    messages.length > 0 &&
    messages[messages.length - 1]?.sender === "bot" &&
    messages[messages.length - 1]?.content.trim() === "" &&
    (messages[messages.length - 1]?.toolInvocations?.length ?? 0) === 0;
  const visibleMessages = shouldHidePendingAssistant
    ? messages.slice(0, -1)
    : messages;
  const streamingMessageId = isResponding
    ? messages[messages.length - 1]?.id
    : undefined;
  const { liveMode, ariaRelevant, ariaAtomic } = useChatLogLiveRegion({
    messages,
    isResponding,
  });

  useScrollToBottom(
    messagesRef,
    [messages, isResponding, prefersReducedMotion],
    {
      behavior: prefersReducedMotion ? "auto" : "smooth",
    },
  );

  return (
    <section className="chat-window chat-window--open">
      <Heading as="h2" size="medium" id="messages-heading" className="sr-only">
        Conversation
      </Heading>
      <List<Message>
        items={visibleMessages}
        keyfield="id"
        as={(message) => (
          <ChatMessage
            message={message}
            isStreaming={isResponding && message.id === streamingMessageId}
          />
        )}
        ref={messagesRef}
        className="chat-window__messages"
        role="log"
        aria-live={liveMode}
        aria-relevant={ariaRelevant}
        aria-atomic={ariaAtomic}
        id="messages"
        tabIndex={-1}
      />
      <Show when={isResponding}>
        <div className="chat-window__message chat-window__message--status">
          <ThinkingIndicator />
        </div>
      </Show>
    </section>
  );
};

export default memo(ChatWindow);
