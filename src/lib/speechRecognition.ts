
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

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

function getConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getConstructor() !== null;
}

export function createBrowserSpeechRecognition(options: {
  language?: string;
  onStart: () => void;
  onResult: (result: BrowserSpeechRecognitionResult) => void;
  onError: (error: BrowserSpeechRecognitionErrorEvent) => void;
  onEnd: () => void;
}): BrowserSpeechRecognition | null {
  const Constructor = getConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = options.language || "cs-CZ";
  recognition.maxAlternatives = 1;
  recognition.onstart = options.onStart;
  recognition.onerror = options.onError;
  recognition.onend = options.onEnd;
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const alternative = result?.[0];
      if (!alternative?.transcript?.trim()) continue;
      options.onResult({
        transcript: alternative.transcript.trim(),
        confidence: Number.isFinite(alternative.confidence) ? alternative.confidence : null,
        isFinal: result.isFinal,
      });
    }
  };

  return recognition;
}
