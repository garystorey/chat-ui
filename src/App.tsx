import { useMemo, useRef, useCallback, type MouseEvent } from "react";
import { ChatHeader, ExportButton, HomePanels, Show, UserInput } from "./components";
import { ChatWindow } from "./features/";
import { ChatProvider, useChat } from "./context/ChatContext";
import { suggestions } from "./config";
import type { UserInputSendPayload } from "./types";
import "./App.css";

const ChatInterface = () => {
  const {
    isResponding,
    isNewChat,
    availableModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    chatHistory,
    currentChat,
    handleSend,
    cancelPendingResponse,
    handleSelectChat,
    handleRemoveChat,
    handleImportChats,
    inputValue,
    setInputValue,
  } = useChat();

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSuggestionSelect = useCallback(
    (value: string) => {
      setInputValue(value);
      inputRef.current?.focus();
    },
    [setInputValue]
  );

  const suggestionItems = useMemo(
    () =>
      suggestions.map((suggestion) => ({
        ...suggestion,
        handleSelect: () => handleSuggestionSelect(suggestion.prompt),
      })),
    [handleSuggestionSelect]
  );

  const handleSkipToMessages = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById("messages");
    if (target instanceof HTMLElement) {
      target.focus();
    }
  }, []);

  const handleSendMessage = useCallback(
    (payload: UserInputSendPayload) => handleSend(payload),
    [handleSend]
  );

  return (
    <article className="app">
      <a href="#messages" className="sr-only skip-link" onClick={handleSkipToMessages}>
        Skip to conversation
      </a>
      <ChatHeader />
      <main className="chat-wrapper" aria-label="Chat interface">
        <div className="chat-main">
          <Show when={!isNewChat}>
            <div className="chat-main__actions">
              <ExportButton currentChat={currentChat} allChats={chatHistory} />
            </div>
          </Show>
          <Show when={!isNewChat}>
            <ChatWindow />
          </Show>

          <div className="chat-main__inline-input chat-main__inline-input--home">
            <UserInput
              ref={inputRef}
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              onStop={cancelPendingResponse}
              isResponding={isResponding}
              availableModels={availableModels}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              isLoadingModels={isLoadingModels}
              showModelSelect={false}
            />
          </div>

          <Show when={isNewChat}>
            <HomePanels
              suggestionItems={suggestionItems}
              onSelectChat={handleSelectChat}
              onRemoveChat={handleRemoveChat}
              onImportChats={handleImportChats}
            />
          </Show>
        </div>
      </main>
    </article>
  );
};

const App = () => (
  <ChatProvider>
    <ChatInterface />
  </ChatProvider>
);

export default App;
