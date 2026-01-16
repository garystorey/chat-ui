import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseSpeechRecognitionOptions {
  locale?: string;
  autoStop?: boolean;
  /**
   * Milliseconds of silence to wait before automatically stopping recognition
   * when {@link autoStop} is enabled.
   */
  silenceTimeoutMs?: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognitionWithVendor = SpeechRecognitionConstructor & {
  new (): SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionWithVendor;
    webkitSpeechRecognition?: SpeechRecognitionWithVendor;
  }
}

const getSpeechRecognitionConstructor = (): SpeechRecognitionWithVendor | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechRecognition = window.SpeechRecognition;
  const webkitSpeechRecognition = window.webkitSpeechRecognition;

  return speechRecognition || webkitSpeechRecognition || null;
};

const useSpeechRecognition = ({
  locale,
  autoStop = true,
  silenceTimeoutMs = 2500,
}: UseSpeechRecognitionOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechRecognitionConstructor = useMemo(
    () => getSpeechRecognitionConstructor(),
    [],
  );

  const supported = Boolean(SpeechRecognitionConstructor);

  const resetState = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    setIsRecording(false);
    setTranscript(finalTranscriptRef.current.trim());
  }, []);

  const stop = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    recognitionRef.current?.stop();
  }, []);

  const scheduleAutoStop = useCallback(() => {
    if (!autoStop) {
      return;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    silenceTimeoutRef.current = setTimeout(() => {
      silenceTimeoutRef.current = null;
      stop();
    }, silenceTimeoutMs);
  }, [autoStop, silenceTimeoutMs, stop]);

  const handleResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${text}`.trim();
        } else {
          interimTranscript += text;
        }
      }

      const combinedTranscript = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
      setTranscript(combinedTranscript);

      scheduleAutoStop();
    },
    [scheduleAutoStop],
  );

  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    setError(event.error);
    resetState();
    recognitionRef.current = null;
  }, [resetState]);

  const handleEnd = useCallback(() => {
    resetState();
    recognitionRef.current = null;
  }, [resetState]);

  const start = useCallback(async () => {
    if (!supported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not available in this browser.');
      return;
    }

    if (!SpeechRecognitionConstructor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (permissionError) {
      setError('Microphone permission was denied.');
      return;
    }

    setError(null);
    finalTranscriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = locale ?? recognition.lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
    scheduleAutoStop();
  }, [SpeechRecognitionConstructor, handleEnd, handleError, handleResult, locale, scheduleAutoStop, supported]);

  useEffect(() => {
    if (!supported) {
      setError('Speech recognition is not supported in this browser.');
    }
  }, [supported]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return {
    supported,
    start,
    stop,
    isRecording,
    transcript,
    error,
  };
};

export default useSpeechRecognition;
