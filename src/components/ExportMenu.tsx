import { useState, useRef, useEffect } from 'react';
import type { ChatSummary } from '../types';
import { exportChat, exportAllChats, type ExportFormat } from '../utils';
import './ExportMenu.css';

interface ExportMenuProps {
  currentChat: ChatSummary | null;
  allChats: ChatSummary[];
}

function ExportMenu({ currentChat, allChats }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportCurrent = (format: ExportFormat) => {
    if (!currentChat) return;
    exportChat(currentChat, format);
    setIsOpen(false);
  };

  const handleExportAll = () => {
    if (allChats.length === 0) return;
    exportAllChats(allChats, 'json');
    setIsOpen(false);
  };

  const hasCurrentChat = currentChat !== null && currentChat.messages.length > 0;
  const hasChats = allChats.length > 0;

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        type="button"
        className="export-menu__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Export chats"
        aria-expanded={isOpen}
        title="Export chats"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="export-menu__icon"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="export-menu__label">Export</span>
      </button>

      {isOpen && (
        <div className="export-menu__dropdown" role="menu">
          {hasCurrentChat && (
            <>
              <div className="export-menu__section-title">Current Chat</div>
              <button
                type="button"
                className="export-menu__item"
                onClick={() => handleExportCurrent('markdown')}
                role="menuitem"
              >
                Export as Markdown (.md)
              </button>
              <button
                type="button"
                className="export-menu__item"
                onClick={() => handleExportCurrent('json')}
                role="menuitem"
              >
                Export as JSON
              </button>
              <button
                type="button"
                className="export-menu__item"
                onClick={() => handleExportCurrent('text')}
                role="menuitem"
              >
                Export as Text (.txt)
              </button>
              {hasChats && <div className="export-menu__divider" />}
            </>
          )}

          {hasChats && (
            <>
              <div className="export-menu__section-title">All Chats</div>
              <button
                type="button"
                className="export-menu__item"
                onClick={handleExportAll}
                role="menuitem"
              >
                Export All as JSON
              </button>
            </>
          )}

          {!hasCurrentChat && !hasChats && (
            <div className="export-menu__empty">No chats to export</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
