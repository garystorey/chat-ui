import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AttachmentIcon, MicIcon, SendIcon, StopIcon } from "./icons";
import {
  combineValueWithTranscript,
  trimTrailingTranscript,
  buildAttachmentsFromFiles,
} from "../utils";
import { Attachment, UserInputSendPayload } from "../types";
import { useAutoResizeTextarea, useSpeechRecognition } from "../hooks";
import List from "./List";
import Show from "./Show";

import "./UserInput.css";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const ACCEPTED_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

type UserInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (payload: UserInputSendPayload) => Promise<boolean> | boolean;
  onStop: () => void;
  isResponding: boolean;
  autoSendOnSpeechEnd?: boolean;
  availableModels: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isLoadingModels: boolean;
};

type AttachmentListItemProps = {
  attachment: Attachment;
  handleRemoveAttachment: (id: string) => void;
};

function AttachmentListItem({
  attachment,
  handleRemoveAttachment,
}: AttachmentListItemProps) {
  return (
    <div className="input-panel__attachment-item">
      <div className="input-panel__attachment-thumbnail">
        {attachment.previewUrl && (
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className="input-panel__attachment-meta">
        <span className="input-panel__attachment-name">{attachment.name}</span>
      </div>
      <button
        type="button"
        className="input-panel__attachment-remove"
        onClick={() => handleRemoveAttachment(attachment.id)}
      >
        &times; <span className="sr-only">Remove {attachment.name}</span>
      </button>
    </div>
  );
}

const UserInput = forwardRef<HTMLTextAreaElement, UserInputProps>(
  ({
    value,
    onChange,
    onSend,
    onStop,
    isResponding,
    autoSendOnSpeechEnd = false,
    availableModels,
    selectedModel,
    onSelectModel,
    isLoadingModels,
  }, forwardedRef) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [canRecord, setCanRecord] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState("");
    const manualValueRef = useRef(value);
    const lastTranscriptRef = useRef("");
    const applyingTranscriptRef = useRef(false);
    const wasRecordingRef = useRef(false);

    const {
      supported: speechSupported,
      start: startRecording,
      stop: stopRecording,
      isRecording,
      transcript,
      error: recordingError,
    } = useSpeechRecognition();

    useEffect(() => {
      setCanRecord(
        speechSupported &&
          typeof navigator !== "undefined" &&
          Boolean(navigator.mediaDevices?.getUserMedia)
      );
    }, [speechSupported]);

    useEffect(() => {
      if (recordingError) {
        setRecordingStatus(recordingError);
        // eslint-disable-next-line no-console
        console.error("Speech recognition error:", recordingError);
        return;
      }

      if (isRecording) {
        setRecordingStatus("Recording in progress");
        return;
      }

      if (!canRecord) {
        setRecordingStatus("Voice input unavailable");
        return;
      }

      setRecordingStatus("");
    }, [canRecord, isRecording, recordingError]);

    useImperativeHandle(forwardedRef, () => textareaRef.current!);
    useAutoResizeTextarea(textareaRef, value);

    const sendMessage = useCallback(
      async (overrideText?: string) => {
        const messageText = overrideText ?? value;
        const trimmed = messageText.trim();

        if (!trimmed && attachments.length === 0) {
          return false;
        }

        const sent = await Promise.resolve(
          onSend({
            text: trimmed,
            attachments,
          })
        );

        if (sent) {
          attachments.forEach((attachment) => {
            if (attachment.previewUrl) {
              URL.revokeObjectURL(attachment.previewUrl);
            }
          });
          setAttachments([]);
          setUploadError(null);
        }

        return sent;
      },
      [attachments, onSend, value]
    );

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void sendMessage();
      },
      [sendMessage]
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void sendMessage();
        }
      },
      [sendMessage]
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        const nextValue = event.target.value;
        manualValueRef.current = trimTrailingTranscript(
          nextValue,
          lastTranscriptRef.current
        );
        onChange(nextValue);
      },
      [onChange]
    );

    const handleAttachmentButtonClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const isImageFile = useCallback((file: File) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return (
        file.type.startsWith("image/") ||
        (extension !== undefined && ACCEPTED_IMAGE_EXTENSIONS.has(extension))
      );
    }, []);

    const getValidationError = useCallback(
      (file: File) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return `"${file.name}" is too large. Maximum size is 5 MB.`;
        }

        if (!isImageFile(file)) {
          return null;
        }

        const extension = file.name.split(".").pop()?.toLowerCase();
        const hasValidType =
          (extension && ACCEPTED_IMAGE_EXTENSIONS.has(extension)) ||
          ACCEPTED_IMAGE_TYPES.has(file.type);

        if (!hasValidType) {
          return `"${file.name}" must be a PNG, JPG, or WEBP image.`;
        }

        return null;
      },
      [isImageFile]
    );

    const buildImageAttachments = useCallback(
      (files: File[]): Attachment[] => {
        const baseAttachments = buildAttachmentsFromFiles(files);

        return baseAttachments.map((attachment, index) => ({
          ...attachment,
          previewUrl: URL.createObjectURL(files[index]),
        }));
      },
      []
    );

    const extractFiles = useCallback((dataTransfer?: DataTransfer | null) => {
      if (!dataTransfer) {
        return [] as File[];
      }

      const items = dataTransfer.items;

      if (items && items.length) {
        return Array.from(items)
          .map((item) => (item.kind === "file" ? item.getAsFile() : null))
          .filter((file): file is File => Boolean(file));
      }

      return Array.from(dataTransfer.files ?? []);
    }, []);

    const handleFiles = useCallback(
      (files: File[]) => {
        if (!files.length) {
          return;
        }

        const errors: string[] = [];
        const validFiles: File[] = [];

        files.forEach((file) => {
          const error = getValidationError(file);
          if (error) {
            errors.push(error);
            return;
          }

          validFiles.push(file);
        });

        if (errors.length) {
          setUploadError(errors.join(" "));
        } else {
          setUploadError(null);
        }

        if (!validFiles.length) {
          return;
        }

        const imageFiles = validFiles.filter(isImageFile);
        const otherFiles = validFiles.filter((file) => !isImageFile(file));

        const nextAttachments = [
          ...buildImageAttachments(imageFiles),
          ...buildAttachmentsFromFiles(otherFiles),
        ];

        setAttachments((current) => [...current, ...nextAttachments]);
      },
      [buildImageAttachments, getValidationError, isImageFile]
    );

    const handleAttachmentChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) {
          return;
        }

        handleFiles(Array.from(files));

        event.target.value = "";
      },
      [handleFiles]
    );

    const handleFileDrop = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = extractFiles(event.dataTransfer);

        if (!files.length) {
          return;
        }

        handleFiles(files);
      },
      [extractFiles, handleFiles]
    );

    const handleRemoveAttachment = useCallback((targetId: string) => {
      setAttachments((current) => {
        const target = current.find((attachment) => attachment.id === targetId);

        if (target?.previewUrl) {
          URL.revokeObjectURL(target.previewUrl);
        }

        return current.filter((attachment) => attachment.id !== targetId);
      });
    }, []);

    const attachmentsRef = useRef<Attachment[]>(attachments);

    useEffect(() => {
      attachmentsRef.current = attachments;
    }, [attachments]);

    useEffect(() => {
      return () => {
        attachmentsRef.current.forEach((attachment) => {
          if (attachment.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
          }
        });
      };
    }, []);

    const handleToggleRecording = useCallback(() => {
      if (isResponding || !canRecord) {
        return;
      }

      if (isRecording) {
        stopRecording();
        return;
      }

      startRecording();
    }, [canRecord, isRecording, isResponding, startRecording, stopRecording]);

    useEffect(() => {
      if (!isRecording) {
        return;
      }

      if (isResponding || !canRecord) {
        stopRecording();
        textareaRef.current?.focus();
      }
    }, [canRecord, isRecording, isResponding, stopRecording]);

    useEffect(() => {
      if (isRecording) {
        textareaRef.current?.blur();
      } else {
        textareaRef.current?.focus();
      }
    }, [isRecording]);

    useEffect(() => {
      if (applyingTranscriptRef.current) {
        applyingTranscriptRef.current = false;
        return;
      }

      manualValueRef.current = trimTrailingTranscript(
        value,
        lastTranscriptRef.current
      );
    }, [value]);

    useEffect(() => {
      if (!isRecording) {
        return;
      }

      const combinedValue = combineValueWithTranscript(
        manualValueRef.current,
        transcript
      );

      lastTranscriptRef.current = transcript;

      if (combinedValue === value) {
        return;
      }

      applyingTranscriptRef.current = true;
      onChange(combinedValue);
    }, [isRecording, onChange, transcript, value]);

    useEffect(() => {
      const wasRecording = wasRecordingRef.current;
      wasRecordingRef.current = isRecording;

      if (
        !autoSendOnSpeechEnd ||
        isRecording ||
        !wasRecording ||
        isResponding
      ) {
        return;
      }

      const composedText = combineValueWithTranscript(
        manualValueRef.current,
        transcript
      ).trim();

      if (!composedText) {
        return;
      }

      void sendMessage(composedText);
    }, [autoSendOnSpeechEnd, isRecording, isResponding, sendMessage, transcript]);

    const handleModelChange = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
        onSelectModel(event.target.value);
      },
      [onSelectModel]
    );

    const micButtonClasses = [
      "input-panel__icon-button",
      "input-panel__icon-button--muted",
      "input-panel__icon-button--mic",
    ];

    if (isRecording) {
      micButtonClasses.push("input-panel__icon-button--recording");
    }

    return (
      <form
        className="input-panel"
        onSubmit={handleSubmit}
        aria-labelledby="inputLabel"
        noValidate
      >
        <div className="input-panel__group">
          <label id="inputLabel" htmlFor="inputText" className="sr-only">
            Enter your request
          </label>
          <div className="input-panel__field">
            <textarea
              id="inputText"
              ref={textareaRef}
              rows={3}
              value={value}
              spellCheck
              required
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-describedby="inputHint"
              autoFocus
            />
          </div>
          <div className="input-panel__controls">
            <input
              ref={fileInputRef}
              type="file"
              className="input-panel__file-input"
              onChange={handleAttachmentChange}
              multiple
              accept="*/*"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="input-panel__model-select">
              <select
                id="modelSelect"
                aria-label="Model"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={isResponding || isLoadingModels}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {isLoadingModels && <span className="input-panel__model-hint">Loading…</span>}
            </div>
            <div className="input-panel__actions">
              <button
                type="button"
                className={micButtonClasses.join(" ")}
                onClick={handleToggleRecording}
                aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                title={isRecording ? "Stop voice input" : "Start voice input"}
                disabled={isResponding || !canRecord}
              >
                <MicIcon />
              </button>
            </div>
            <div
              className="input-panel__mic-status"
              aria-live="polite"
              role="status"
            >
              {recordingStatus && <span>{recordingStatus}</span>}
            </div>
            {isResponding ? (
              <button
                type="button"
                className="input-panel__submit"
                aria-label="Stop response"
                title="Stop response"
                onClick={onStop}
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="submit"
                className="input-panel__submit"
                aria-label="Send message"
                title="Send message"
              >
                <SendIcon />
              </button>
            )}
          </div>
          <div
            className="input-panel__dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleFileDrop}
          >
            <div className="input-panel__dropzone-body">
              <div className="input-panel__dropzone-copy">
                <p className="input-panel__dropzone-title">Add attachments</p>
                <p className="input-panel__dropzone-hint">
                  Drag and drop files up to 5 MB. Image uploads show a preview.
                </p>
              </div>
              <button
                type="button"
                className="input-panel__dropzone-button"
                onClick={handleAttachmentButtonClick}
                aria-label="Add attachment"
                title="Add attachment"
              >
                <AttachmentIcon />
                <span className="sr-only">Add attachment</span>
              </button>
            </div>
          </div>
          {uploadError && (
            <p className="input-panel__upload-error" role="alert">
              {uploadError}
            </p>
          )}
          <Show when={attachments.length > 0}>
            <List<Attachment>
              className="input-panel__attachment-grid"
              items={attachments}
              keyfield="id"
              as={(a) => (
                <AttachmentListItem
                  attachment={a}
                  handleRemoveAttachment={handleRemoveAttachment}
                />
              )}
            />
          </Show>
          <div id="inputHint" className="sr-only">
            Press Enter to send and Shift+Enter for newline
          </div>
        </div>
      </form>
    );
  }
);

UserInput.displayName = "UserInput";

export default UserInput;
