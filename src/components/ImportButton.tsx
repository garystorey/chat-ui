import { useRef } from "react";
import type { ChatSummary, ToastType } from "../types";
import { formatErrorMessage, importChatsFromFile } from "../utils";

import "./ImportButton.css";

interface ImportButtonProps {
  onImportChats: (chats: ChatSummary[]) => void;
  onToast: (toast: {
    type: ToastType;
    message: string;
    duration?: number;
  }) => void;
}

function ImportButton({ onImportChats, onToast }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importChatsFromFile(file);

      if (result.success && result.chats.length > 0) {
        onImportChats(result.chats);
        onToast({
          type: "success",
          message: `Imported ${result.chats.length} chat${result.chats.length === 1 ? "" : "s"}`,
          duration: 3000,
        });
      } else {
        onToast({
          type: "error",
          message: result.errors[0] || "Import failed",
          duration: 4000,
        });
      }
    } catch (error) {
      onToast({
        type: "error",
        message: formatErrorMessage(error, "Import failed."),
        duration: 4000,
      });
    }

    event.target.value = "";
  };

  return (
    <div className="import-button">
      <button
        type="button"
        className="import-button__btn"
        onClick={handleImportClick}
        aria-label="Import chats from file"
        title="Import chats"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="import-button__icon"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="import-button__label">Import</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label="Import chats file"
      />
    </div>
  );
}

export default ImportButton;
