export interface TranscriptEntry {
  speaker: "operator" | "customer";
  text: string;
  timestamp: string;
}

export type CallTranscript =
  | { kind: "structured"; entries: TranscriptEntry[] }
  | { kind: "plain_text"; text: string }
  | { kind: "unavailable" };

function isTranscriptEntry(value: unknown): value is TranscriptEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (entry.speaker === "operator" || entry.speaker === "customer")
    && typeof entry.text === "string"
    && typeof entry.timestamp === "string";
}

export function parseCallTranscript(value: string | null): CallTranscript {
  const text = value?.trim();
  if (!text) return { kind: "unavailable" };

  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every(isTranscriptEntry)) {
      return { kind: "structured", entries: parsed };
    }
  } catch {
    // A non-empty legacy transcript remains real evidence as plain text.
  }

  return { kind: "plain_text", text };
}
