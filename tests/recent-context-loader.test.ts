import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRecentContext, type RecentContextCalendarResult } from "@/components/workspace/recentContextLoader";
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

const calendarWithCallback = {
  entries: [{
    id: "callback-active",
    type: "callback",
    title: "Callback",
    starts_at: "2026-09-01T10:00:00.000Z",
    remind_at: null,
    status: "scheduled",
    lead: { id: "lead-1", full_name: "Lead One", phone: "+420000000000", email: null },
    reminder: null,
  }],
  sources: {
    callbacks: { state: "available" },
    reminders: { state: "available" },
  },
} satisfies RecentContextCalendarResult;

const emptyCalendar = {
  entries: [],
  sources: {
    callbacks: { state: "available" },
    reminders: { state: "available" },
  },
} satisfies RecentContextCalendarResult;

describe("recent context loader", () => {
  it("keeps activities when the calendar database source is unavailable", async () => {
    const result = await loadRecentContext("lead-1", {
      loadActivities: async () => activities,
      loadCalendar: async () => {
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
      loadCalendar: async () => calendarWithCallback,
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
      loadCalendar: async () => {
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
      loadCalendar: async () => emptyCalendar,
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
        loadCalendar: async () => calendarWithCallback,
      })).rejects.toMatchObject({ code });
    },
  );

  it("rethrows an unclassified error instead of treating it as a provider outage", async () => {
    const error = new Error("unexpected failure");

    await expect(loadRecentContext("lead-1", {
      loadActivities: async () => activities,
      loadCalendar: async () => { throw error; },
    })).rejects.toBe(error);
  });

  it("keeps an explicit stale or unavailable marker in the row during refresh", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/workspace/RecentContextRow.tsx"), "utf8");

    expect(source).toContain("stale");
    expect(source).toContain("Unavailable");
  });
});
