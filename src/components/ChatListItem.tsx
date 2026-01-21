import { PreviewChat } from "../types";

type ChatListItemProps = {
  chat: PreviewChat;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
};

const ChatListItem = ({
  chat,
  activeChatId,
  onSelectChat,
  onRemoveChat,
}: ChatListItemProps) => {
  return (
    <div className="sidebar__chat-item">
      <button
        type="button"
        className={`sidebar__chat ${
          chat.id === activeChatId ? "sidebar__chat--active" : ""
        }`}
        onClick={() => onSelectChat(chat.id)}
        title={chat.title}
      >
        <span className="sidebar__chat-title">{chat.title}</span>
        <span className="sidebar__chat-preview">{chat.preview}</span>
      </button>
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
  );
};
export default ChatListItem;
