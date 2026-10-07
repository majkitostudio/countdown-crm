import { describe, expect, it } from "vitest";
import {
  formatCzechCallbackCount,
  getScheduledCallbacksBannerState,
  type ScheduledCallbackItem,
} from "@/lib/scheduledCallbacksBanner";

describe("Scheduled callbacks banner logic and Czech copy", () => {
  it("inflects Czech count properly", () => {
    expect(formatCzechCallbackCount(1)).toBe("1 hovor");
    expect(formatCzechCallbackCount(2)).toBe("2 hovory");
    expect(formatCzechCallbackCount(3)).toBe("3 hovory");
    expect(formatCzechCallbackCount(4)).toBe("4 hovory");
    expect(formatCzechCallbackCount(5)).toBe("5 hovorů");
    expect(formatCzechCallbackCount(10)).toBe("10 hovorů");
  });

  it("handles morning callbacks window correctly", () => {
    const morningTime = new Date("2026-10-07T07:00:00.000Z"); // morning
    const callbacks: ScheduledCallbackItem[] = [
      { id: "c1", leadName: "Pavel Novák", scheduledAt: "2026-10-07T07:30:00.000Z" },
      { id: "c2", leadName: "Jana Malá", scheduledAt: "2026-10-07T08:30:00.000Z" },
    ];

    const state = getScheduledCallbacksBannerState(callbacks, morningTime);
    expect(state.hasCallbacksToday).toBe(true);
    expect(state.morningCount).toBe(2);
    expect(state.headline).toBe("Máte 2 hovory k vyřízení na dnešní dopoledne");
    expect(state.urgency).toBe("scheduled");
    expect(state.subtext).toContain("Pavel Novák");
  });

  it("prioritizes overdue callbacks with critical urgency", () => {
    const now = new Date("2026-10-07T10:15:00.000Z");
    const callbacks: ScheduledCallbackItem[] = [
      { id: "c1", leadName: "Karel Černý", scheduledAt: "2026-10-07T09:45:00.000Z" }, // overdue
      { id: "c2", leadName: "Marie Bílá", scheduledAt: "2026-10-07T14:00:00.000Z" },
    ];

    const state = getScheduledCallbacksBannerState(callbacks, now);
    expect(state.overdueCount).toBe(1);
    expect(state.headline).toBe("Máte 1 hovor čekající na vyřízení právě teď");
    expect(state.urgency).toBe("critical");
    expect(state.subtext).toContain("Karel Černý");
  });

  it("handles afternoon callbacks window correctly", () => {
    const afternoonTime = new Date("2026-10-07T13:00:00.000Z"); // afternoon
    const callbacks: ScheduledCallbackItem[] = [
      { id: "c1", leadName: "Tomáš Dvořák", scheduledAt: "2026-10-07T14:30:00.000Z" },
      { id: "c2", leadName: "Eva Veselá", scheduledAt: "2026-10-07T16:00:00.000Z" },
      { id: "c3", leadName: "Lukáš Král", scheduledAt: "2026-10-07T17:15:00.000Z" },
    ];

    const state = getScheduledCallbacksBannerState(callbacks, afternoonTime);
    expect(state.afternoonCount).toBe(3);
    expect(state.headline).toBe("Máte 3 hovory k vyřízení na dnešní odpoledne");
    expect(state.urgency).toBe("scheduled");
  });
});
