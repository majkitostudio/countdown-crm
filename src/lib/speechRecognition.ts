export type BrowserSpeechRecognitionError =
  | "aborted"
  | "audio-capture"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed"
  | "language-not-supported"
  | "unknown";

export interface BrowserSpeechRecognitionResult {
  transcript: string;
  confidence: number | null;
  isFinal: boolean;
}

export interface BrowserSpeechRecognitionErrorEvent {
  error: BrowserSpeechRecognitionError;
  message?: string;
}

export interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: BrowserSpeechRecognitionResultList }) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: {
    isFinal: boolean;
    length: number;
    [index: number]: {
      transcript: string;
      confidence: number;
    };
  };
}

export interface ContinuousSpeechRecognitionOptions {
  language?: string;
  onStart: () => void;
  onInterimResult: (transcript: string) => void;
  onFinalResult: (transcript: string, confidence: number | null) => void;
  onError: (error: BrowserSpeechRecognitionErrorEvent) => void;
  onEnd: () => void;
}

export interface ContinuousSpeechRecognition {
  recognition: BrowserSpeechRecognition | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/**
 * Creates a continuous speech recognition that:
 * - Runs continuously (continuous=true) and auto-restarts on end
 * - Emits interim results for live feedback
 * - Emits final results for processing
 * - Auto-restarts on end/error (except aborted/not-allowed)
 * - Uses a ref to avoid race conditions on start/stop
 */
export function createContinuousSpeechRecognition(options: ContinuousSpeechRecognitionOptions): ContinuousSpeechRecognition | null {
  const Constructor = getConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.language || "cs-CZ";
  recognition.maxAlternatives = 1;

  let isRestarting = false;
  let isStopped = false;

  const handleResult = (event: { resultIndex: number; results: BrowserSpeechRecognitionResultList }) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const alternative = result?.[0];
      if (!alternative?.transcript?.trim()) continue;

      const transcript = alternative.transcript.trim();
      const confidence = Number.isFinite(alternative.confidence) ? alternative.confidence : null;

      if (result.isFinal) {
        options.onFinalResult(transcript, confidence);
      } else {
        options.onInterimResult(transcript);
      }
    }
  };

  const handleError = (event: BrowserSpeechRecognitionErrorEvent) => {
    // Don't restart on these errors
    if (event.error === "aborted" || event.error === "not-allowed") {
      isStopped = true;
      options.onError(event);
      return;
    }
    // For other errors, let onEnd handle restart
    options.onError(event);
  };

  const handleEnd = () => {
    if (isStopped || isRestarting) return;
    isRestarting = true;
    // Small delay before restart to avoid tight loop
    setTimeout(() => {
      isRestarting = false;
      if (!isStopped) {
        try {
          recognition.start();
        } catch {
          // Ignore start errors during restart
        }
      }
    }, 300);
  };

  recognition.onstart = options.onStart;
  recognition.onerror = handleError;
  recognition.onend = handleEnd;
  recognition.onresult = handleResult;

  return {
    recognition,
    start: () => {
      isStopped = false;
      try {
        recognition.start();
      } catch {
        // Already started
      }
    },
    stop: () => {
      isStopped = true;
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    },
    abort: () => {
      isStopped = true;
      try {
        recognition.abort();
      } catch {
        // Ignore
      }
    },
  };
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getConstructor() !== null;
}

function getConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}