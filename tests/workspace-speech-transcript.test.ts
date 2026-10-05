import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { buildCallQualityPrompt } from "@/lib/callQualityReview";
import { parseCallTranscript } from "@/lib/callTranscript";

const projectRoot = path.resolve(__dirname, "..");

describe("workspace silent speech transcription and quality review integration", () => {
  it("implements silent speech recognition lifecycle in workspace page", () => {
    const workspacePage = readFileSync(path.join(projectRoot, "src", "app", "workspace", "page.tsx"), "utf8");

    // Continuous speech recognition initialized during active calls
    expect(workspacePage).toContain("createContinuousSpeechRecognition");
    expect(workspacePage).toContain("isBrowserSpeechRecognitionSupported");
    expect(workspacePage).toContain('language: "cs-CZ"');

    // Speech is muted when softphone is muted
    expect(workspacePage).toContain("softphoneSession.isMuted");

    // Formats timestamps with mm:ss
    expect(workspacePage).toContain("transcriptEntriesRef.current.push");
    expect(workspacePage).toContain('speaker: "operator"');

    // Passes recorded transcript to both completion actions
    expect(workspacePage).toContain("transcript: recordedTranscript");

    // Preserves transcript in retry payload
    expect(workspacePage).toContain("preservedTranscript: recordedTranscript");

    // Runs silently without disturbing operator toasts for recognition errors
    expect(workspacePage).toContain("[SpeechRecognition] Silent");
    expect(workspacePage).not.toContain('setNotificationToast("Speech recognition');
  });

  it("renders captured transcript indicator in PostCallSummaryCard", () => {
    const html = renderToStaticMarkup(
      React.createElement(PostCallSummaryCard, {
        summary: {
          leadName: "Marie Nováková",
          outcomeLabel: "Objednávka",
          durationSeconds: 140,
          orderStatus: "created",
          transcriptStatus: "captured",
          workflowEntries: [],
          workflowDispatches: [],
        },
        onDismiss: () => {},
        onNextLead: () => {},
        saveState: "saved",
      }),
    );

    expect(html).toContain("Call transcript captured.");
    expect(html).not.toContain("Call transcript unavailable.");
  });

  it("renders unavailable transcript indicator when transcript was not captured", () => {
    const html = renderToStaticMarkup(
      React.createElement(PostCallSummaryCard, {
        summary: {
          leadName: "Marie Nováková",
          outcomeLabel: "Nedovoláno",
          durationSeconds: 15,
          orderStatus: "not_created",
          transcriptStatus: "unavailable",
          workflowEntries: [],
          workflowDispatches: [],
        },
        onDismiss: () => {},
        onNextLead: () => {},
        saveState: "saved",
      }),
    );

    expect(html).toContain("Call transcript unavailable.");
    expect(html).not.toContain("Call transcript captured.");
  });

  it("formats structured transcript into human-readable dialog for Gemini quality review", () => {
    const structured = [
      { speaker: "operator" as const, timestamp: "00:05", text: "Dobrý den, volám ohledně vaší poptávky kloubní výživy." },
      { speaker: "customer" as const, timestamp: "00:15", text: "Dobrý den, bolí mě kolena při chůzi do schodů." },
      { speaker: "operator" as const, timestamp: "00:28", text: "Doporučuji tříměsíční kúru s kolagenem a vitamínem C za zvýhodněnou cenu 1 199 Kč." },
    ];

    const rawTranscript = JSON.stringify(structured);
    expect(parseCallTranscript(rawTranscript)).toEqual({
      kind: "structured",
      entries: structured,
    });

    const prompt = buildCallQualityPrompt({
      operatorNote: "Klientka má bolesti kolen, nabídnuta tříměsíční kúra za 1 199 Kč.",
      transcript: rawTranscript,
      durationSeconds: 180,
      outcome: "order_placed",
      failReason: null,
    });

    expect(prompt).toContain("[00:05] Operátor: Dobrý den, volám ohledně vaší poptávky kloubní výživy.");
    expect(prompt).toContain("[00:15] Klient: Dobrý den, bolí mě kolena při chůzi do schodů.");
    expect(prompt).toContain("[00:28] Operátor: Doporučuji tříměsíční kúru s kolagenem a vitamínem C za zvýhodněnou cenu 1 199 Kč.");
    expect(prompt).toContain("Poznámka operátora:");
    expect(prompt).toContain("Metadata hovoru:");
  });
});
