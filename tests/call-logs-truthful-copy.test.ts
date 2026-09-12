import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/calls/page.tsx"), "utf8");
const drawer = readFileSync(resolve(process.cwd(), "src/components/calls/CallDetailDrawer.tsx"), "utf8");

describe("Call Logs truthful transcript copy", () => {
  it("does not promise a full or real-time transcript for every call", () => {
    expect(source).not.toContain("full speech transcript protocols");
    expect(source).not.toContain("Real-time call history logs");
    expect(source).toContain("any verified captured transcripts");
    expect(source).toContain("A record may not include audio or a transcript.");
  });

  it("shows transcript evidence without making the row action promise a transcript", () => {
    expect(drawer).toContain('call.transcript.kind === "unavailable"');
    expect(drawer).toContain("No verified speech transcript was captured");
    expect(source).toContain("View record");
    expect(source).not.toContain("View transcript");
  });

  it("uses call review instead of sentiment or an ambiguous actions column", () => {
    expect(source).toContain("Call review");
    expect(source).not.toContain(">Sentiment<");
    expect(source).not.toContain(">Actions<");
    expect(source).not.toContain("c.sentiment");
    expect(source).toContain("reviewStatusLabel(c.review_status)");
  });
});
