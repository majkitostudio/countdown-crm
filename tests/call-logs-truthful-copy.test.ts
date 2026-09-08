import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/calls/page.tsx"), "utf8");

describe("Call Logs truthful transcript copy", () => {
  it("does not promise a full or real-time transcript for every call", () => {
    expect(source).not.toContain("full speech transcript protocols");
    expect(source).not.toContain("Real-time call history logs");
    expect(source).toContain("captured transcript availability");
  });

  it("labels the row action from the transcript evidence state", () => {
    expect(source).toContain('c.transcript.kind === "unavailable"');
    expect(source).toContain("View call details");
    expect(source).toContain("View transcript");
    expect(source).not.toContain("<span>Transcript</span>");
  });
});
