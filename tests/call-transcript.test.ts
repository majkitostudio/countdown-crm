import { describe, expect, it } from "vitest";

import { parseCallTranscript } from "@/lib/callTranscript";

describe("parseCallTranscript", () => {
  it("keeps a valid structured transcript", () => {
    const raw = JSON.stringify([
      { speaker: "operator", timestamp: "00:01", text: "Dobrý den" },
    ]);

    expect(parseCallTranscript(raw)).toEqual({
      kind: "structured",
      entries: [
        { speaker: "operator", timestamp: "00:01", text: "Dobrý den" },
      ],
    });
  });

  it("keeps a non-empty legacy transcript as plain text", () => {
    expect(parseCallTranscript("Operátor: Dobrý den\nKlient: Dobrý den")).toEqual({
      kind: "plain_text",
      text: "Operátor: Dobrý den\nKlient: Dobrý den",
    });
  });

  it("does not treat malformed structured data as verified transcript turns", () => {
    expect(parseCallTranscript('[{"speaker":"assistant","text":7}]')).toEqual({
      kind: "plain_text",
      text: '[{"speaker":"assistant","text":7}]',
    });
  });

  it("marks null and whitespace-only values unavailable", () => {
    expect(parseCallTranscript(null)).toEqual({ kind: "unavailable" });
    expect(parseCallTranscript("   ")).toEqual({ kind: "unavailable" });
  });
});
