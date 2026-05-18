import Show from "../elements/Show";
import ThemeToggle from "../theme/ThemeToggle";
import { useConnectionStatus } from "../../hooks";

interface ChatHeaderProps {
  handleNewChat: () => void;
  availableModels: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isResponding: boolean;
  isLoadingModels: boolean;
  hasHeaderModelOptions: boolean;
  onRetryConnection?: () => void;
}

function ChatHeader({
  handleNewChat,
  availableModels,
  selectedModel,
  setSelectedModel,
  isResponding,
  isLoadingModels,
  hasHeaderModelOptions,
  onRetryConnection,
}: ChatHeaderProps) {
  const { connectionStatus, statusLabel, retryConnection } =
    useConnectionStatus();
  const showModelPlaceholder = hasHeaderModelOptions && !selectedModel;
  const modelLabel =
    selectedModel.slice(selectedModel.lastIndexOf("/") + 1, selectedModel.length) ||
    "Select a model";

  return (
    <header className="app__topbar" aria-label="Chat controls">
      <div className="app__topbar-left">
        <button type="button" className="app__new-chat" onClick={handleNewChat}>
          <svg
            aria-hidden="true"
            className="app__new-chat-icon"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
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
          onClick={() => {
            retryConnection();
            onRetryConnection?.();
          }}
        >
          <span
            className={`app__status-dot app__status-dot--${connectionStatus}`}
            aria-hidden="true"
          />
          <span className="app__status-label">{statusLabel}</span>
          <svg
            aria-hidden="true"
            className="app__status-wave"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path d="M2 12h3l2.2-5.5 3.6 11 3-9 2 3.5H22" />
          </svg>
        </button>
        <div className="app__model-select">
          <Show when={hasHeaderModelOptions}>
            <label
              className="app__model-select-control"
              htmlFor="headerModelSelect"
            >
              <span className="app__model-label sr-only">Model</span>
              <span className="app__model-select-display" aria-hidden="true">
                <svg
                  className="app__model-icon"
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <rect x="7" y="7" width="10" height="10" rx="2" />
                  <path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3" />
                  <path d="M10 12h4" />
                </svg>
                <span>{modelLabel}</span>
              </span>
              <select
                id="headerModelSelect"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={isResponding || isLoadingModels}
                aria-label="Select model"
              >
                <Show when={showModelPlaceholder}>
                  <option value="" disabled>
                    Select a model
                  </option>
                </Show>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model.slice(model.lastIndexOf("/") + 1, model.length)}
                  </option>
                ))}
              </select>
            </label>
          </Show>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default ChatHeader;
