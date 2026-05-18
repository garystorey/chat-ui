import { useMemo, useState } from "react";
import type { ChatSummary, HomeTab } from "../../types";

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

export default function useHomePanels(
  chatHistory: ChatSummary[],
  activeTab: HomeTab["id"],
) {
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

  return {
    tabs,
    activeTab,
    searchTerm,
    setSearchTerm,
    filteredChats,
  } as const;
}
