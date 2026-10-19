import { describe, expect, it } from "vitest";
import { getScheduledCallAttention, isOverdueScheduledCall } from "@/lib/scheduleAttention";

const now = new Date("2026-09-14T10:00:00.000Z");

describe("team scheduled call attention", () => {
  it("counts only scheduled calls and separates overdue items", () => {
    const summary = getScheduledCallAttention([
      { state: "scheduled", scheduled_at: "2026-09-14T09:00:00.000Z" },
      { state: "scheduled", scheduled_at: "2026-09-14T14:00:00.000Z" },
      { state: "available", scheduled_at: "2026-09-14T08:00:00.000Z" },
      { state: "scheduled", scheduled_at: null },
      { state: "scheduled", scheduled_at: "not-a-date" },
    ], now);

    expect(summary).toEqual({ total: 2, scheduled: 1, overdue: 1 });
  });

  it("does not mark a future scheduled call as overdue", () => {
    expect(isOverdueScheduledCall({ state: "scheduled", scheduled_at: "2026-09-14T10:01:00.000Z" }, now)).toBe(false);
  });
});
