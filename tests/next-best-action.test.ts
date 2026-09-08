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

  it("shows an urgent reorder as partial when callback priority cannot be verified", () => {
    const result = resolveNextBestActionState(
      { state: "unavailable", message: "Scheduled callbacks could not be loaded." },
      {
        state: "available",
        data: [{
          id: "reorder-1",
          lead_id: "lead-2",
          lead_name: "Petr Svoboda",
          product_title: "Test product",
          days_remaining: 1,
          urgency: "urgent",
        }],
      },
      now,
    );

    expect(result).toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "reorder", source_id: "reorder-1" }),
      unavailableSources: ["callbacks"],
      message: "Scheduled callbacks could not be loaded.",
    });
  });

  it("shows a due callback as partial when reorder estimates are unavailable", () => {
    const result = resolveNextBestActionState(
      {
        state: "available",
        data: [{
          id: "callback-1",
          lead_id: "lead-1",
          lead_name: "Jana Nováková",
          scheduled_at: "2026-08-31T11:30:00.000Z",
        }],
      },
      { state: "unavailable", message: "Re-order estimates could not be loaded." },
      now,
    );

    expect(result).toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "callback", source_id: "callback-1" }),
      unavailableSources: ["reorders"],
      message: "Re-order estimates could not be loaded.",
    });
  });

  it("does not fabricate a queue action when the reorder source is unavailable", () => {
    const result = resolveNextBestActionState(
      { state: "available", data: [] },
      { state: "unavailable", message: "Re-order estimates could not be loaded." },
      now,
    );

    expect(result).toEqual({
      status: "unavailable",
      unavailableSources: ["reorders"],
      message: "Re-order estimates could not be loaded.",
    });
  });

  it("does not fabricate a queue action when the callback source is unavailable", () => {
    const result = resolveNextBestActionState(
      { state: "unavailable", message: "Scheduled callbacks could not be loaded." },
      { state: "available", data: [] },
      now,
    );

    expect(result).toEqual({
      status: "unavailable",
      unavailableSources: ["callbacks"],
      message: "Scheduled callbacks could not be loaded.",
    });
  });

  it("uses the queue only when both sources are verified available and empty", () => {
    const result = resolveNextBestActionState(
      { state: "available", data: [] },
      { state: "available", data: [] },
      now,
    );

    expect(result).toEqual({
      status: "ready",
      action: expect.objectContaining({ kind: "queue", source: "lead queue" }),
    });
  });

  it("returns unavailable when both priority sources are unavailable", () => {
    const result = resolveNextBestActionState(
      { state: "unavailable", message: "Scheduled callbacks could not be loaded." },
      { state: "unavailable", message: "Re-order estimates could not be loaded." },
      now,
    );

    expect(result).toEqual({
      status: "unavailable",
      unavailableSources: ["callbacks", "reorders"],
      message: "Scheduled callbacks could not be loaded. Re-order estimates could not be loaded.",
    });
  });

  it("uses an urgent reorder definitively when callbacks are available but only scheduled later", () => {
    const result = resolveNextBestActionState(
      {
        state: "available",
        data: [{
          id: "callback-later",
          lead_id: "lead-later",
          lead_name: "Later customer",
          scheduled_at: "2026-09-03T11:30:00.000Z",
        }],
      },
      {
        state: "available",
        data: [{
          id: "reorder-1",
          lead_id: "lead-2",
          lead_name: "Petr Svoboda",
          product_title: "Test product",
          days_remaining: 1,
          urgency: "urgent",
        }],
      },
      now,
    );

    expect(result).toEqual({
      status: "ready",
      action: expect.objectContaining({ kind: "reorder", source_id: "reorder-1" }),
    });
  });
});
