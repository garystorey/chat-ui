import { useEffect, useRef, useState } from "react";
import { PreviewChat } from "../types";

type ChatListItemProps = {
  chat: PreviewChat;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
  onRenameChat: (chatId: string, nextTitle: string) => void;
};

const ChatListItem = ({
  chat,
  activeChatId,
  onSelectChat,
  onRemoveChat,
  onRenameChat,
}: ChatListItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    setDraftTitle(chat.title);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [chat.title, isRenaming]);

  const handleRenameCancel = () => {
    setDraftTitle(chat.title);
    setIsRenaming(false);
  };

  const handleRenameSave = () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      handleRenameCancel();
      return;
    }

    if (trimmedTitle !== chat.title) {
      onRenameChat(chat.id, trimmedTitle);
    }
    setIsRenaming(false);
  };

  return (
    <div className="sidebar__chat-item">
      {isRenaming ? (
        <div
          className={`sidebar__chat sidebar__chat--editing ${
            chat.id === activeChatId ? "sidebar__chat--active" : ""
          }`}
        >
          <div className="sidebar__chat-header">
            <div className="sidebar__chat-heading" />
            <button
              type="button"
              className="sidebar__chat-remove"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveChat(chat.id);
              }}
              aria-label={`Remove ${chat.title}`}
              title={`Remove ${chat.title}`}
            >
              &times;
            </button>
          </div>
          <label className="sr-only" htmlFor={`rename-${chat.id}`}>
            Rename chat
          </label>
          <input
            id={`rename-${chat.id}`}
            ref={inputRef}
            className="sidebar__chat-input"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleRenameSave();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                handleRenameCancel();
              }
            }}
          />
          <span className="sidebar__chat-preview">{chat.preview}</span>
        </div>
      ) : (
        <div
          className={`sidebar__chat ${
            chat.id === activeChatId ? "sidebar__chat--active" : ""
          }`}
          role="button"
          tabIndex={0}
          onClick={() => onSelectChat(chat.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelectChat(chat.id);
            }
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            setIsRenaming(true);
          }}
          title={chat.title}
        >
          <div className="sidebar__chat-header">
            <div className="sidebar__chat-heading">
              <span className="sidebar__chat-title">{chat.title}</span>
              <button
                type="button"
                className="sidebar__chat-rename"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsRenaming(true);
                }}
                aria-label={`Rename ${chat.title}`}
                title={`Rename ${chat.title}`}
                disabled={isRenaming}
              >
                <span className="sidebar__chat-rename-icon" aria-hidden="true">
                  ✎
                </span>
                <span className="sr-only">Rename</span>
              </button>
            </div>
            <button
              type="button"
              className="sidebar__chat-remove"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveChat(chat.id);
              }}
              aria-label={`Remove ${chat.title}`}
              title={`Remove ${chat.title}`}
            >
              &times;
            </button>
          </div>
          <span className="sidebar__chat-preview">{chat.preview}</span>
        </div>
      )}
    </div>
  );
};
export default ChatListItem;
