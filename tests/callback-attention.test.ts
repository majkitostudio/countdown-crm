import { describe, expect, it } from "vitest";
import { getCallbackAttention, isOverdueCallback } from "@/lib/callbackAttention";

const now = new Date("2026-09-14T10:00:00.000Z");

describe("team callback attention", () => {
  it("counts only scheduled callbacks and separates overdue items", () => {
    const summary = getCallbackAttention([
      { state: "waiting_callback", scheduled_at: "2026-09-14T09:00:00.000Z" },
      { state: "waiting_callback", scheduled_at: "2026-09-14T14:00:00.000Z" },
      { state: "available", scheduled_at: "2026-09-14T08:00:00.000Z" },
      { state: "waiting_callback", scheduled_at: null },
      { state: "waiting_callback", scheduled_at: "not-a-date" },
    ], now);

    expect(summary).toEqual({ total: 2, scheduled: 1, overdue: 1 });
  });

  it("does not mark a future callback as overdue", () => {
    expect(isOverdueCallback({ state: "waiting_callback", scheduled_at: "2026-09-14T10:01:00.000Z" }, now)).toBe(false);
  });
});
