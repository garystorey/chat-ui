import { useMemo, useState, type ReactNode } from "react";
import type { ChatSummary, HomeTab, Suggestion, ToastType } from "../types";
import ExportButton from "./ExportButton";
import ImportButton from "./ImportButton";
import ChatList from "./ChatList";
import List from "./List";
import Show from "./Show";
import Suggestions from "./Suggestions";

export type HomePanelsProps = {
  suggestionItems: Suggestion[];
  chatHistory: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onRemoveChat: (chatId: string) => void;
  onImportChats: (chats: ChatSummary[]) => void;
  onToast: (toast: {
    type: ToastType;
    message: string;
    duration?: number;
  }) => void;
  currentChat: ChatSummary | null;
  allChats: ChatSummary[];
};

const tabs: HomeTab[] = [
  {
    id: "suggestions",
    label: "Suggestions",
    tabId: "tab-start",
    panelId: "panel-start",
  },
  {
    id: "recent",
    label: "Recent",
    tabId: "tab-recent",
    panelId: "panel-recent",
  },
];

const suggestionsTab = tabs[0];
const recentTab = tabs[1];

type PanelProps = {
  panelId: string;
  tabId: string;
  className?: string;
  as?: "div" | "section";
  children: ReactNode;
};

const Panel = ({
  panelId,
  tabId,
  className,
  as: Component = "div",
  children,
}: PanelProps) => (
  <Component role="tabpanel" id={panelId} aria-labelledby={tabId} className={className}>
    {children}
  </Component>
);

type PanelHeaderProps = {
  title: string;
  children?: ReactNode;
};

const PanelHeader = ({ title, children }: PanelHeaderProps) => (
  <div className="recent-panel__header">
    <h2 className="recent-panel__title">{title}</h2>
    {children ? <div className="recent-panel__controls">{children}</div> : null}
  </div>
);

const HomePanels = ({
  suggestionItems,
  chatHistory,
  activeChatId,
  onSelectChat,
  onRemoveChat,
  onImportChats,
  onToast,
  currentChat,
  allChats,
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
      <div
        className="home-panels__tabs"
        role="tablist"
        aria-label="Start and recent tabs"
      >
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
        <Show when={activeTab === "suggestions"}>
          <Panel panelId={suggestionsTab.panelId} tabId={suggestionsTab.tabId}>
            <PanelHeader title="Suggestions" />
            <Suggestions
              suggestions={suggestionItems}
              classes={["suggestions", "home-panels__suggestions"]}
            />
          </Panel>
        </Show>
        <Show when={activeTab === "recent"}>
          <Panel
            as="section"
            className="recent-panel"
            panelId={recentTab.panelId}
            tabId={recentTab.tabId}
          >
            <PanelHeader title="Recent chats">
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
              <div className="recent-panel__actions">
                <ImportButton onImportChats={onImportChats} onToast={onToast} />
                <ExportButton currentChat={currentChat} allChats={allChats} />
              </div>
            </PanelHeader>
            <div className="recent-panel__list">
              <ChatList
                chats={filteredChats}
                activeChatId={activeChatId}
                onSelectChat={onSelectChat}
                onRemoveChat={onRemoveChat}
              />
            </div>
          </Panel>
        </Show>
      </div>
    </section>
  );
};

export default HomePanels;
