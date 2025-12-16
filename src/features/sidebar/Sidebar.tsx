import { useEffect, useMemo, useState } from "react";
import type { ChatSummary } from "../../types";
import { ChatList, Show, ThemeToggle } from "../../components";
import type { ConnectionStatus } from "../../hooks/useConnectionListeners";

import "./Sidebar.css";

type SidebarProps = {
  collapsed: boolean;
  chats: ChatSummary[];
  activeChatId: string | null;
  connectionStatus: ConnectionStatus;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
  onRetryConnection: () => void;
};

const Sidebar = ({
  collapsed,
  chats,
  activeChatId,
  connectionStatus,
  onToggle,
  onNewChat,
  onSelectChat,
  onRemoveChat,
  onRetryConnection,
}: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const isOffline = connectionStatus === "offline";
  const statusLabel = isOffline ? "Offline" : "Online";

  useEffect(() => {
    if (collapsed) {
      setSearchTerm("");
    }
  }, [collapsed]);

  const handleRetryConnection = () => {
    if (isOffline) {
      onRetryConnection();
    }
  };

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return chats;
    }
    return chats.filter((chat) => {
      const titleMatch = chat.title.toLowerCase().includes(term);
      const previewMatch = chat.preview.toLowerCase().includes(term);
      return titleMatch || previewMatch;
    });
  }, [chats, searchTerm]);

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      aria-label="Chat navigation"
    >
      <div className="sidebar__inner">
        <div className="sidebar__header">
          <button
            type="button"
            className="sidebar__status"
            role="status"
            aria-live="polite"
            aria-label={
              isOffline
                ? "Connection offline. Click to retry connection."
                : `Connection status: ${statusLabel}`
            }
            title={
              isOffline
                ? "Connection offline. Click to retry connection."
                : `Connection status: ${statusLabel}`
            }
            onClick={handleRetryConnection}
            disabled={!isOffline}
          >
            <span
              className={`sidebar__status-dot sidebar__status-dot--${connectionStatus}`}
              aria-hidden="true"
            />
            <span
              className={`sidebar__status-label ${collapsed ? "sr-only" : ""}`}
            >
              {isOffline ? "Offline" : statusLabel}
            </span>
          </button>

          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">{collapsed ? "<" : ">"}</span>
          </button>
        </div>

        <Show when={!collapsed}>
          <div className="sidebar__theme">
            <ThemeToggle />
          </div>
        </Show>
        <div className="sidebar__actions">
          <button type="button" className="sidebar__action" onClick={onNewChat}>
            <span className="sidebar__action-icon" aria-hidden="true">
              +
            </span>
            <span className="sidebar__action-label">New Chat</span>
          </button>

          <Show when={!collapsed}>
            <label className="sidebar__search">
              <span className="sidebar__search-icon" aria-hidden="true">
                🔍
              </span>
              <span className="sr-only">Search chats</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search chats"
              />
            </label>
          </Show>

        </div>
        <Show when={!collapsed}>
          <ChatList
            chats={filteredChats}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onRemoveChat={onRemoveChat}
          />
        </Show>
      </div>
    </aside>
  );
};

export default Sidebar;
