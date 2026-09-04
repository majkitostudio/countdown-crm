import { describe, expect, it } from "vitest";
import { getNextBestAction, resolveNextBestActionState } from "@/lib/nextBestAction";

const now = new Date("2026-08-31T10:00:00.000Z");

describe("next best action", () => {
  it("prioritizes a callback due within 24 hours", () => {
    const result = getNextBestAction({
      now,
      callbacks: [{
        id: "callback-1",
        lead_id: "lead-1",
        lead_name: "Jana Nováková",
        scheduled_at: "2026-08-31T11:30:00.000Z",
      }],
      reorderOpportunities: [{
        id: "reorder-1",
        lead_id: "lead-2",
        lead_name: "Petr Svoboda",
        product_title: "Test product",
        days_remaining: 1,
        urgency: "urgent",
      }],
    });

    expect(result.kind).toBe("callback");
    expect(result.source_id).toBe("callback-1");
    expect(result.href).toBe("/workspace?leadId=lead-1");
  });

  it("falls back to the urgent re-order estimate", () => {
    const result = getNextBestAction({
      now,
      callbacks: [{
        id: "callback-later",
        lead_id: "lead-later",
        lead_name: "Later customer",
        scheduled_at: "2026-09-03T11:30:00.000Z",
      }],
      reorderOpportunities: [{
        id: "reorder-1",
        lead_id: "lead-2",
        lead_name: "Petr Svoboda",
        product_title: "Test product",
        days_remaining: 1,
        urgency: "urgent",
      }],
    });

    expect(result.kind).toBe("reorder");
    expect(result.source).toBe("re-order estimate");
  });

  it("uses a truthful queue fallback when no signal exists", () => {
    const result = getNextBestAction({ now });

    expect(result.kind).toBe("queue");
    expect(result.href).toBe("/workspace");
    expect(result.source_id).toBeNull();
  });

  it("keeps the next-best-action card unavailable when the callback source is unavailable", () => {
    const result = resolveNextBestActionState(
      {
        entries: [],
        sources: {
          callbacks: {
            state: "unavailable",
            message: "Scheduled callbacks could not be loaded.",
          },
          reminders: { state: "available" },
        },
      },
      [{
        id: "reorder-1",
        lead_id: "lead-2",
        lead_name: "Petr Svoboda",
        product_title: "Test product",
        days_remaining: 1,
        urgency: "urgent",
      }],
      now,
    );

    expect(result).toEqual({
      status: "unavailable",
      message: "Scheduled callbacks could not be loaded.",
    });
  });
});
