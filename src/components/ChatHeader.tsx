import { ConnectionStatus, ChatSummary } from "../types";
import ExportMenu from "./ExportMenu";
import List from "./List";
import Show from "./Show";
import ThemeToggle from "./ThemeToggle";

interface ChatHeaderProps {
    handleNewChat: () => void;
    connectionStatus: ConnectionStatus;
    statusLabel: string;
    retryConnection: () => void;
    availableModels: string[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    isResponding: boolean;
    isLoadingModels: boolean;
    hasHeaderModelOptions: boolean;
    currentChat: ChatSummary | null;
    allChats: ChatSummary[];
    onImportChats: (chats: ChatSummary[]) => void;
}

function ChatHeader({handleNewChat, connectionStatus, statusLabel, retryConnection, availableModels, selectedModel, setSelectedModel, isResponding, isLoadingModels, hasHeaderModelOptions, currentChat, allChats, onImportChats}: ChatHeaderProps) {
    return (      
        <header className="app__topbar" aria-label="Chat controls">
            <div className="app__topbar-left">
              <button type="button" className="app__new-chat" onClick={handleNewChat}>
                New Chat
              </button>
            </div>
            <div className="app__topbar-right">
              <button
                type="button"
                className="app__status"
                role="status"
                aria-live="polite"
                aria-label={`Connection status: ${statusLabel}. Click to retry connection.`}
                title={`Connection status: ${statusLabel}. Click to retry connection.`}
                onClick={retryConnection}
              >
                <span className={`app__status-dot app__status-dot--${connectionStatus}`} aria-hidden="true" />
                <span className="app__status-label">{statusLabel}</span>
              </button>
              <div className="app__model-select">
                <Show when={hasHeaderModelOptions}>
                  <label className="app__model-select-control" htmlFor="headerModelSelect">
                    <span className="app__model-label sr-only">Model</span>
                    <select
                      id="headerModelSelect"
                      value={selectedModel}
                      onChange={(event) => setSelectedModel(event.target.value)}
                      disabled={isResponding || isLoadingModels}
                      aria-label="Select model"
                    >
                        <List<string> items={availableModels} keyfield={(item) => item} as={(item) => (
                          <option key={item} value={item}>
                            {item.slice(item.lastIndexOf("/") + 1, item.length)}
                          </option>
                        )}>

                        </List>
                    </select>
                  </label>
                </Show>
                <Show when={!hasHeaderModelOptions}>
                  <div className="app__model-hint" aria-live="polite">
                    {isLoadingModels ? "Loading…" : "Models unavailable"}
                  </div>
                </Show>

              </div>
              <ExportMenu currentChat={currentChat} allChats={allChats} onImportChats={onImportChats} />
              <ThemeToggle />
            </div>
          </header>
    );
}

export default ChatHeader;