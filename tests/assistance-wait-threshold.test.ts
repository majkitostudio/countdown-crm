import { describe, expect, it } from "vitest";
import {
  ASSISTANCE_WAIT_THRESHOLD_MS,
  formatAssistanceWait,
  isAssistanceOverdue,
} from "@/lib/assistanceWait";

const NOW = Date.parse("2026-09-19T07:20:00.000Z");
const atSecondsAgo = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("assistance 5-minute attention threshold", () => {
  it("is exactly five minutes", () => {
    expect(ASSISTANCE_WAIT_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });

  it("flags waiting longer than five minutes as overdue", () => {
    expect(isAssistanceOverdue(atSecondsAgo(299), NOW)).toBe(false);
    expect(isAssistanceOverdue(atSecondsAgo(300), NOW)).toBe(true);
    expect(isAssistanceOverdue(atSecondsAgo(3600), NOW)).toBe(true);
  });

  it("formats short and long waits like the checkpoint badge", () => {
    expect(formatAssistanceWait(atSecondsAgo(4), NOW)).toBe("4 s");
    expect(formatAssistanceWait(atSecondsAgo(125), NOW)).toBe("2 m 5 s");
    expect(formatAssistanceWait(atSecondsAgo(39 * 24 * 60 * 60 + 4 * 60 + 49), NOW)).toBe("39 d 4 m");
  });

  it("shows an invalid timestamp as unavailable", () => {
    expect(formatAssistanceWait("not-a-timestamp", NOW)).toBe("—");
  });
});
