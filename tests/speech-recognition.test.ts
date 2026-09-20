import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createContinuousSpeechRecognition,
  isBrowserSpeechRecognitionSupported,
} from "@/lib/speechRecognition";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser speech recognition adapter (continuous)", () => {
  it("reports unsupported when the browser API is missing", () => {
    vi.stubGlobal("window", {});

    expect(isBrowserSpeechRecognitionSupported()).toBe(false);
    expect(createContinuousSpeechRecognition({
      onStart: vi.fn(),
      onInterimResult: vi.fn(),
      onFinalResult: vi.fn(),
      onError: vi.fn(),
      onEnd: vi.fn(),
    })).toBeNull();
  });

  it("configures Czech continuous recognition and forwards results", () => {
    class FakeRecognition {
      continuous = true;
      interimResults = true;
      lang = "";
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; length: number; [index: number]: { transcript: string; confidence: number } } } }) => void) | null = null;
      onerror: ((event: { error: "aborted" | "audio-capture" | "network" | "no-speech" | "not-allowed" | "service-not-allowed" | "language-not-supported" | "unknown"; message?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }

    vi.stubGlobal("window", { SpeechRecognition: FakeRecognition });
    const onStart = vi.fn();
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const onError = vi.fn();
    const onEnd = vi.fn();
    const continuous = createContinuousSpeechRecognition({ onStart, onInterimResult: onInterim, onFinalResult: onFinal, onError, onEnd });

    expect(continuous).not.toBeNull();
    expect(continuous?.recognition).toMatchObject({
      continuous: true,
      interimResults: true,
      lang: "cs-CZ",
      maxAlternatives: 1,
    });

    continuous?.recognition?.onstart?.();
    continuous?.recognition?.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: false, length: 1, 0: { transcript: "Dobrý", confidence: 0.9 } },
      ],
    });

    // Simulate final result
    continuous?.recognition?.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, length: 1, 0: { transcript: "Dobrý den", confidence: 0.91 } },
      ],
    });

    // Don't call onend - continuous recognition auto-restarts, so onEnd is only called on stop/abort

    expect(onStart).toHaveBeenCalledOnce();
    expect(onInterim).toHaveBeenCalledWith("Dobrý");
    expect(onFinal).toHaveBeenCalledWith("Dobrý den", 0.91);
    expect(onError).not.toHaveBeenCalled();
    // onEnd is only called when stop/abort is called, not on auto-restart
  });
});