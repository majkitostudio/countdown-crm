import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createBrowserSpeechRecognition,
  isBrowserSpeechRecognitionSupported,
  type BrowserSpeechRecognition,
} from "@/lib/speechRecognition";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser speech recognition adapter", () => {
  it("reports unsupported when the browser API is missing", () => {
    vi.stubGlobal("window", {});

    expect(isBrowserSpeechRecognitionSupported()).toBe(false);
    expect(createBrowserSpeechRecognition({
      onStart: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
      onEnd: vi.fn(),
    })).toBeNull();
  });

  it("configures Czech interim recognition and forwards final confidence", () => {
    class FakeRecognition implements BrowserSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      maxAlternatives = 0;
      onstart: (() => void) | null = null;
      onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; length: number; [index: number]: { transcript: string; confidence: number } } } }) => void) | null = null;
      onerror: BrowserSpeechRecognition["onerror"] = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }

    vi.stubGlobal("window", { SpeechRecognition: FakeRecognition });
    const onStart = vi.fn();
    const onResult = vi.fn();
    const onError = vi.fn();
    const onEnd = vi.fn();
    const recognition = createBrowserSpeechRecognition({ onStart, onResult, onError, onEnd });

    expect(recognition).not.toBeNull();
    expect(recognition).toMatchObject({
      continuous: false,
      interimResults: true,
      lang: "cs-CZ",
      maxAlternatives: 1,
    });

    recognition?.onstart?.();
    recognition?.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, length: 1, 0: { transcript: " Dobrý den ", confidence: 0.91 } },
      ],
    });
    recognition?.onend?.();

    expect(onStart).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith({ transcript: "Dobrý den", confidence: 0.91, isFinal: true });
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });
});
