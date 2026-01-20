import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { MicIcon, SendIcon, StopIcon } from "./icons";
import { combineValueWithTranscript, trimTrailingTranscript } from "../utils";
import { UserInputSendPayload } from "../types";
import { useAutoResizeTextarea, useSpeechRecognition } from "../hooks";
import "./UserInput.css";
import { Show } from ".";
import type { ToastType } from "./Toast";

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
  showModelSelect?: boolean;
  onToast?: (toast: { type: ToastType; message: string; duration?: number }) => void;
};

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
    showModelSelect = true,
    onToast,
  }, forwardedRef) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    const requiresModelSelection =
      showModelSelect && availableModels.length > 0 && !selectedModel;

    const sendMessage = useCallback(
      async (overrideText?: string) => {
        if (requiresModelSelection) {
          return false;
        }

        const messageText = overrideText ?? value;
        const trimmed = messageText.trim();

        if (!trimmed) {
          return false;
        }

        return Promise.resolve(
          onSend({
            text: trimmed,
            model: selectedModel,
          })
        );
      },
      [onSend, requiresModelSelection, value]
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

    const hasModelOptions = showModelSelect && availableModels.length > 0;
    const showModelPlaceholder = hasModelOptions && !selectedModel;

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
            <Show when={showModelSelect}>
              <div className="input-panel__model-select">
                <Show when={hasModelOptions}>
                  <select
                    id="modelSelect"
                    aria-label="Model"
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={isResponding || isLoadingModels}
                  >
                    <Show when={showModelPlaceholder}>
                      <option value="" disabled>
                        Select a model
                      </option>
                    </Show>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </Show>
                <Show when={!hasModelOptions && !isLoadingModels}>
                  <span className="input-panel__model-hint">Model list unavailable</span>
                </Show>
                <Show when={isLoadingModels}>
                  <span className="input-panel__model-hint">Loading…</span>
                </Show>
              </div>

            </Show>
            <Show when={!showModelSelect && isLoadingModels}>
              <div className="input-panel__model-select">
                <span className="input-panel__model-hint">Loading models…</span>
              </div>
            </Show>
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
                disabled={requiresModelSelection}
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
  }
);

UserInput.displayName = "UserInput";

export default UserInput;
