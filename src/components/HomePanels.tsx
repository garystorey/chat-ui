import { useMemo, useState } from "react";

import type { ChatSummary, Suggestion } from "../types";
import ChatList from "./ChatList";
import List from "./List";
import Show from "./Show";
import Suggestions from "./Suggestions";

type HomePanelsProps = {
  suggestionItems: Suggestion[];
  chatHistory: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
};

type HomeTab = {
  id: "suggestions" | "recent";
  label: string;
  tabId: string;
  panelId: string;
};

const tabs: HomeTab[] = [
  { id: "suggestions", label: "Suggestions", tabId: "tab-start", panelId: "panel-start" },
  { id: "recent", label: "Recent", tabId: "tab-recent", panelId: "panel-recent" },
];

const HomePanels = ({
  suggestionItems,
  chatHistory,
  activeChatId,
  onSelectChat,
  onRemoveChat,
}: HomePanelsProps) => {
  const [activeTab, setActiveTab] = useState<HomeTab["id"]>("suggestions");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return chatHistory;
    }

    return chatHistory.filter((chat) => {
      const titleMatch = chat.title.toLowerCase().includes(term);
      const previewMatch = chat.preview.toLowerCase().includes(term);
      return titleMatch || previewMatch;
    });
  }, [chatHistory, searchTerm]);

  return (
    <section className="home-panels" aria-label="Start and recent chats">
      <div className="home-panels__tabs" role="tablist" aria-label="Start and recent tabs">
        <List<HomeTab>
          className="home-panels__tab-list"
          items={tabs}
          keyfield="id"
          as={(tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`home-panels__tab ${
                activeTab === tab.id ? "home-panels__tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
              id={tab.tabId}
              aria-controls={tab.panelId}
            >
              {tab.label}
            </button>
          )}
        />
      </div>
      <div className="home-panels__body">
        <List<HomeTab>
          className="home-panels__panel-list"
          items={tabs}
          keyfield="panelId"
          as={(tab) => (
            <Show when={activeTab === tab.id}>
              <Show when={tab.id === "suggestions"}>
                <div role="tabpanel" id={tab.panelId} aria-labelledby={tab.tabId}>
                  <Suggestions
                    suggestions={suggestionItems}
                    classes={["suggestions", "home-panels__suggestions"]}
                  />
                </div>
              </Show>
              <Show when={tab.id === "recent"}>
                <section
                  className="recent-panel"
                  role="tabpanel"
                  id={tab.panelId}
                  aria-labelledby={tab.tabId}
                >
                  <div className="recent-panel__header">
                    <h2 className="recent-panel__title">Recent chats</h2>
                    <label className="recent-panel__search" htmlFor="recentSearch">
                      <span className="recent-panel__search-icon" aria-hidden="true">
                        🔍
                      </span>
                      <span className="sr-only">Search chats</span>
                      <input
                        id="recentSearch"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search chats"
                      />
                    </label>
                  </div>
                  <div className="recent-panel__list">
                    <ChatList
                      chats={filteredChats}
                      activeChatId={activeChatId}
                      onSelectChat={onSelectChat}
                      onRemoveChat={onRemoveChat}
                    />
                  </div>
                </section>
              </Show>
            </Show>
          )}
        />
      </div>
    </section>
  );
};

export default HomePanels;
