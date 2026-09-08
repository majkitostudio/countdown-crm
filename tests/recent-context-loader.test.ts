import { describe, expect, it } from "vitest";
import {
  applyRecentContextRefresh,
  canRetainRecentContext,
  loadRecentContext,
  shouldMarkRecentContextStale,
} from "@/components/workspace/recentContextLoader";
import { buildRecentContext, type RecentContextLoadResult } from "@/components/workspace/recentContext";
import type { WorkspaceActivity } from "@/lib/domain";

const activities: WorkspaceActivity[] = [
  {
    id: "call-latest",
    record: { id: "lead-1", type: "lead" },
    type: "call",
    title: "Call Logged",
    actor: "Operator",
    timestamp: "2026-08-30T10:00:00.000Z",
    metadata: { call_outcome: "order_placed" },
    source: "supabase",
  },
];

const callbackEntries = [{
  id: "callback-active",
  lead_id: "lead-1",
  scheduled_at: "2026-09-01T10:00:00.000Z",
}];

describe("recent context loader", () => {
  it("retains stale context only for the same lead", () => {
    expect(canRetainRecentContext("lead-1", "lead-1")).toBe(true);
    expect(canRetainRecentContext("lead-1", "lead-2")).toBe(false);
    expect(canRetainRecentContext(undefined, "lead-1")).toBe(false);
  });

  it("marks only retained partial or unavailable results as stale", () => {
    expect(shouldMarkRecentContextStale(false, "partial")).toBe(false);
    expect(shouldMarkRecentContextStale(true, "ready")).toBe(false);
    expect(shouldMarkRecentContextStale(true, "partial")).toBe(false);
    expect(shouldMarkRecentContextStale(true, "unavailable")).toBe(true);
  });

  it("retains only same-lead unavailable data and keeps fresh partial data non-stale", () => {
    const previous = {
      leadId: "lead-1",
      data: buildRecentContext("lead-1", activities, callbackEntries),
    };
    const partial: RecentContextLoadResult = {
      state: "partial",
      isEmpty: false,
      context: buildRecentContext("lead-1", [], callbackEntries),
      unavailableSources: ["activities"],
      messages: { activities: "Activities temporarily unavailable." },
    };
    const unavailable: RecentContextLoadResult = {
      state: "unavailable",
      isEmpty: false,
      context: null,
      unavailableSources: ["activities", "callbacks"],
      messages: { activities: "Activities failed.", calendar: "Calendar failed." },
    };

    expect(applyRecentContextRefresh(previous, "lead-1", partial)).toEqual({
      context: { leadId: "lead-1", data: partial.context },
      isStale: false,
    });
    expect(applyRecentContextRefresh(previous, "lead-1", unavailable)).toEqual({
      context: previous,
      isStale: true,
    });
    expect(applyRecentContextRefresh(previous, "lead-2", unavailable)).toEqual({
      context: null,
      isStale: false,
    });
  });

  it("keeps activities when the calendar database source is unavailable", async () => {
    const result = await loadRecentContext("lead-1", {
      loadSources: async () => ({
        activities: { status: "ready", data: activities },
        callbacks: {
          status: "unavailable",
          reason: "database",
          message: "Calendar temporarily unavailable.",
        },
      }),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.lastContact?.activity.id).toBe("call-latest");
    expect(result.messages.calendar).toContain("Calendar");
  });

  it("keeps calendar callbacks when activities database source is unavailable", async () => {
    const result = await loadRecentContext("lead-1", {
      loadSources: async () => ({
        activities: {
          status: "unavailable",
          reason: "database",
          message: "Activities temporarily unavailable.",
        },
        callbacks: { status: "ready", data: callbackEntries },
      }),
    });

    expect(result.state).toBe("partial");
    expect(result.context?.activeCallback?.id).toBe("callback-active");
    expect(result.messages.activities).toContain("Activities");
  });

  it("returns unavailable when both database sources fail", async () => {
    const result = await loadRecentContext("lead-1", {
      loadSources: async () => ({
        activities: {
          status: "unavailable",
          reason: "database",
          message: "Activities failed.",
        },
        callbacks: {
          status: "unavailable",
          reason: "database",
          message: "Calendar failed.",
        },
      }),
    });

    expect(result.state).toBe("unavailable");
    expect(result.context).toBeNull();
    expect(result.unavailableSources).toEqual(["activities", "callbacks"]);
  });

  it("keeps verified empty data distinct from unavailable data", async () => {
    const result = await loadRecentContext("lead-empty", {
      loadSources: async () => ({
        activities: { status: "ready", data: [] },
        callbacks: { status: "ready", data: [] },
      }),
    });

    expect(result.state).toBe("ready");
    expect(result.isEmpty).toBe(true);
    expect(result.unavailableSources).toEqual([]);
  });

  it("propagates a server boundary failure without client-side classification", async () => {
    const error = new Error("unexpected failure");

    await expect(loadRecentContext("lead-1", {
      loadSources: async () => { throw error; },
    })).rejects.toBe(error);
  });

});
