import { PreviewChat } from "../types";
import ChatListItem from "./ChatListItem";
import Heading from "./Heading";
import List from "./List";
import Show from "./Show";

type ChatListProps = {
  chats: PreviewChat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
  onRenameChat: (chatId: string, nextTitle: string) => void;
};

function ChatList({
  chats,
  activeChatId,
  onSelectChat,
  onRemoveChat,
  onRenameChat,
}: ChatListProps) {
  return (
    <nav className="sidebar__chats" aria-label="Previous chats">
      <Heading as="h2" size="medium" variant="caps">
        Chats
      </Heading>
      <List<PreviewChat>
        className="sidebar__chat-list"
        items={chats}
        keyfield="id"
        as={(chat) => (
          <ChatListItem
            chat={chat}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onRemoveChat={onRemoveChat}
            onRenameChat={onRenameChat}
          />
        )}
      />
      <Show when={chats.length === 0}>
        <div className="sidebar__empty">No chats found</div>
      </Show>
    </nav>
  );
}
export default ChatList;
