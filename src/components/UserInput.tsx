import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { ImageIcon, MicIcon, SendIcon, StopIcon } from "./icons";
import {
  combineValueWithTranscript,
  getId,
  trimTrailingTranscript,
} from "../utils";
import { MessageAttachment, ToastType, UserInputSendPayload } from "../types";
import { useAutoResizeTextarea, useSpeechRecognition } from "../hooks";
import { Show } from ".";
import "./UserInput.css";

const useTranscriptValue = (initialValue: string) => {
  const manualValueRef = useRef(initialValue);
  const lastTranscriptRef = useRef("");
  const applyingTranscriptRef = useRef(false);

  const applyUserInput = useCallback((nextValue: string) => {
    manualValueRef.current = trimTrailingTranscript(
      nextValue,
      lastTranscriptRef.current,
    );
    return nextValue;
  }, []);

  const applyTranscript = useCallback((transcript: string) => {
    const combinedValue = combineValueWithTranscript(
      manualValueRef.current,
      transcript,
    );
    lastTranscriptRef.current = transcript;
    return combinedValue;
  }, []);

  return {
    manualValueRef,
    lastTranscriptRef,
    applyingTranscriptRef,
    applyUserInput,
    applyTranscript,
  };
};

type UserInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (payload: UserInputSendPayload) => Promise<boolean> | boolean;
  onStop: () => void;
  isResponding: boolean;
  autoSendOnSpeechEnd?: boolean;
  sendPayload?: Omit<UserInputSendPayload, "text">;
  onToast?: (toast: {
    type: ToastType;
    message: string;
    duration?: number;
  }) => void;
};

const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read image data"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });

const UserInput = forwardRef<HTMLTextAreaElement, UserInputProps>(
  (
    {
      value,
      onChange,
      onSend,
      onStop,
      isResponding,
      autoSendOnSpeechEnd = false,
      sendPayload,
      onToast,
    },
    forwardedRef,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
      manualValueRef,
      lastTranscriptRef,
      applyingTranscriptRef,
      applyUserInput,
      applyTranscript,
    } = useTranscriptValue(value);
    const wasRecordingRef = useRef(false);
    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const {
      supported: speechSupported,
      start: startRecording,
      stop: stopRecording,
      isRecording,
      transcript,
      error: recordingError,
    } = useSpeechRecognition();

    const canRecord =
      speechSupported &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    const recordingStatus = recordingError
      ? recordingError
      : isRecording
        ? "Recording in progress"
        : !canRecord
          ? "Voice input unavailable"
          : "";

    useEffect(() => {
      if (recordingError) {
        // eslint-disable-next-line no-console
        console.error("Speech recognition error:", recordingError);
        onToast?.({
          type: "error",
          message: recordingError,
          duration: 4000,
        });
      }
    }, [onToast, recordingError]);

    useImperativeHandle(forwardedRef, () => textareaRef.current!);
    useAutoResizeTextarea(textareaRef, value);

    const sendMessage = useCallback(
      async (overrideText?: string) => {
        const messageText = overrideText ?? value;
        const trimmed = messageText.trim();

        if (!trimmed && attachments.length === 0) {
          return false;
        }

        const didSend = await Promise.resolve(
          onSend({
            text: trimmed,
            attachments: attachments.length ? attachments : undefined,
            ...sendPayload,
          }),
        );

        if (didSend) {
          setAttachments([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }

        return didSend;
      },
      [attachments, onSend, sendPayload, value],
    );

    const handleSubmit = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void sendMessage();
      },
      [sendMessage],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void sendMessage();
        }
      },
      [sendMessage],
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        const nextValue = applyUserInput(event.target.value);
        onChange(nextValue);
      },
      [applyUserInput, onChange],
    );

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
        lastTranscriptRef.current,
      );
    }, [value]);

    useEffect(() => {
      if (!isRecording) {
        return;
      }

      const combinedValue = applyTranscript(transcript);

      if (combinedValue === value) {
        return;
      }

      applyingTranscriptRef.current = true;
      onChange(combinedValue);
    }, [applyTranscript, isRecording, onChange, transcript, value]);

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

      const composedText = applyTranscript(transcript).trim();

      if (!composedText) {
        return;
      }

      void sendMessage(composedText);
    }, [
      autoSendOnSpeechEnd,
      isRecording,
      isResponding,
      applyTranscript,
      sendMessage,
      transcript,
    ]);

    const handleFileClick = useCallback(() => {
      if (isResponding) {
        return;
      }

      fileInputRef.current?.click();
    }, [isResponding]);

    const processFiles = useCallback(
      async (files: File[]) => {
        if (!files.length) {
          return;
        }

        if (attachments.length + files.length > MAX_IMAGE_ATTACHMENTS) {
          onToast?.({
            type: "warning",
            message: `You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`,
          });
          return;
        }

        const nextAttachments: MessageAttachment[] = [];

        for (const file of files) {
          if (!file.type.startsWith("image/")) {
            onToast?.({
              type: "warning",
              message: `${file.name} is not an image file.`,
            });
            continue;
          }

          if (file.size > MAX_IMAGE_BYTES) {
            onToast?.({
              type: "warning",
              message: `${file.name} exceeds the 5MB limit.`,
            });
            continue;
          }

          try {
            const url = await readFileAsDataUrl(file);
            nextAttachments.push({
              id: getId(),
              type: "image",
              name: file.name,
              mimeType: file.type,
              size: file.size,
              url,
            });
          } catch (error) {
            onToast?.({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to attach image.",
            });
          }
        }

        if (nextAttachments.length > 0) {
          setAttachments((current) => [...current, ...nextAttachments]);
        }
      },
      [attachments.length, onToast],
    );

    const handleFileChange = useCallback(
      async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        await processFiles(files);
        event.target.value = "";
      },
      [processFiles],
    );

    const handleDrop = useCallback(
      async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        await processFiles(files);
      },
      [processFiles],
    );

    const handleDragOver = useCallback(
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!isDragging) {
          setIsDragging(true);
        }
      },
      [isDragging],
    );

    const handleDragLeave = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleRemoveAttachment = useCallback((id: string) => {
      setAttachments((current) => current.filter((item) => item.id !== id));
    }, []);

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
          <div
            className={`input-panel__dropzone${
              isDragging ? " input-panel__dropzone--active" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            aria-label="Image drop zone"
          >
            <span className="sr-only">
              Drop an image here or use the upload button. Up to{" "}
              {MAX_IMAGE_ATTACHMENTS} images.
            </span>
            {attachments.length > 0 && (
              <ul className="input-panel__attachment-list">
                {attachments.map((attachment) => (
                  <li key={attachment.id} className="input-panel__attachment">
                    <span className="input-panel__attachment-name">
                      {attachment.name}
                    </span>
                    <button
                      type="button"
                      className="input-panel__attachment-remove"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <span className="sr-only">Remove</span>
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="input-panel__controls">
            <div className="input-panel__actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="input-panel__file-input"
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
              />
              <button
                type="button"
                className="input-panel__icon-button"
                onClick={handleFileClick}
                aria-label="Add images"
                title="Add images"
                disabled={
                  isResponding || attachments.length >= MAX_IMAGE_ATTACHMENTS
                }
              >
                <ImageIcon />
              </button>
              <button
                type="button"
                className={micButtonClasses.join(" ")}
                onClick={handleToggleRecording}
                aria-label={
                  isRecording ? "Stop voice input" : "Start voice input"
                }
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
              <Show when={!!recordingStatus}>
                <span>{recordingStatus}</span>
              </Show>
            </div>
            <Show when={isResponding}>
              <button
                type="button"
                className="input-panel__submit"
                aria-label="Stop response"
                title="Stop response"
                onClick={onStop}
              >
                <StopIcon />
              </button>
            </Show>
            <Show when={!isResponding}>
              <button
                type="submit"
                className="input-panel__submit"
                aria-label="Send message"
                title="Send message"
              >
                <SendIcon />
              </button>
            </Show>
          </div>
          <div id="inputHint" className="sr-only">
            Press Enter to send and Shift+Enter for newline
          </div>
        </div>
      </form>
    );
  },
);

UserInput.displayName = "UserInput";

export default UserInput;
