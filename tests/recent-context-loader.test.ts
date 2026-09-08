import { describe, expect, it } from "vitest";
import {
  canRetainRecentContext,
  loadRecentContext,
  shouldMarkRecentContextStale,
} from "@/components/workspace/recentContextLoader";
import type { WorkspaceActivity } from "@/lib/domain";

function dataAccessError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

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
    expect(shouldMarkRecentContextStale(true, "partial")).toBe(true);
    expect(shouldMarkRecentContextStale(true, "unavailable")).toBe(true);
  });

  it("keeps activities when the calendar database source is unavailable", async () => {
    const result = await loadRecentContext("lead-1", {
      loadActivities: async () => activities,
      loadCallbacks: async () => {
        throw dataAccessError("DATABASE", "Calendar temporarily unavailable.");
      },
    });

    expect(result.state).toBe("partial");
    expect(result.context?.lastContact?.activity.id).toBe("call-latest");
    expect(result.messages.calendar).toContain("Calendar");
  });

  it("keeps calendar callbacks when activities database source is unavailable", async () => {
    const result = await loadRecentContext("lead-1", {
      loadActivities: async () => {
        throw dataAccessError("DATABASE", "Activities temporarily unavailable.");
      },
      loadCallbacks: async () => callbackEntries,
    });

    expect(result.state).toBe("partial");
    expect(result.context?.activeCallback?.id).toBe("callback-active");
    expect(result.messages.activities).toContain("Activities");
  });

  it("returns unavailable when both database sources fail", async () => {
    const result = await loadRecentContext("lead-1", {
      loadActivities: async () => {
        throw dataAccessError("DATABASE", "Activities failed.");
      },
      loadCallbacks: async () => {
        throw dataAccessError("DATABASE", "Calendar failed.");
      },
    });

    expect(result.state).toBe("unavailable");
    expect(result.context).toBeNull();
    expect(result.unavailableSources).toEqual(["activities", "callbacks"]);
  });

  it("keeps verified empty data distinct from unavailable data", async () => {
    const result = await loadRecentContext("lead-empty", {
      loadActivities: async () => [],
      loadCallbacks: async () => [],
    });

    expect(result.state).toBe("ready");
    expect(result.isEmpty).toBe(true);
    expect(result.unavailableSources).toEqual([]);
  });

  it.each(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT"] as const)(
    "rethrows %s instead of weakening it to a partial result",
    async (code) => {
      await expect(loadRecentContext("lead-1", {
        loadActivities: async () => {
          throw dataAccessError(code, `${code} failure`);
        },
        loadCallbacks: async () => callbackEntries,
      })).rejects.toMatchObject({ code });
    },
  );

  it("rethrows an unclassified error instead of treating it as a provider outage", async () => {
    const error = new Error("unexpected failure");

    await expect(loadRecentContext("lead-1", {
      loadActivities: async () => activities,
      loadCallbacks: async () => { throw error; },
    })).rejects.toBe(error);
  });

});
