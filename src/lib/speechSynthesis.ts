export interface SpeakOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSynthesisSupported()) {
    if (options.onEnd) options.onEnd();
    return;
  }

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || "cs-CZ";
  utterance.pitch = options.pitch ?? 1.0;
  utterance.rate = options.rate ?? 1.0;

  // Try to find a Czech or Slovak voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) => v.lang.startsWith("cs") || v.lang.startsWith("sk")
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    if (options.onStart) options.onStart();
  };

  utterance.onend = () => {
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    console.warn("SpeechSynthesis error:", e);
    if (options.onError) options.onError(e);
    if (options.onEnd) options.onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

export function getPersonaVoiceSettings(personalityType: string): { pitch: number; rate: number } {
  switch (personalityType) {
    case "Skeptický":
      return { pitch: 0.85, rate: 0.9 };
    case "Nedůvěřivý":
      return { pitch: 0.9, rate: 0.85 };
    case "Cenově citlivý":
      return { pitch: 1.1, rate: 1.0 };
    case "Náročný / Cholerický":
      return { pitch: 0.95, rate: 1.2 };
    default:
      return { pitch: 1.0, rate: 1.0 };
  }
}
