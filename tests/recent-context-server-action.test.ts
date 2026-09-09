import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLeadActivities: vi.fn(),
  listScheduledCallbacksForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/domainActivity", () => ({
  getLeadActivities: mocks.getLeadActivities,
}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listScheduledCallbacksForWorkspace: mocks.listScheduledCallbacksForWorkspace,
}));

import { DataAccessError } from "@/lib/dal/errors";
import { loadRecentContextSourcesAction } from "@/app/actions/recentContext";

const activities = [{
  id: "activity-1",
  record: { id: "lead-1", type: "lead" as const },
  type: "call" as const,
  title: "Call Logged",
  actor: "Operator",
  timestamp: "2026-08-30T10:00:00.000Z",
  source: "supabase" as const,
}];

const callbacks = [{
  id: "callback-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  scheduled_at: "2026-09-01T10:00:00.000Z",
  preferred_operator_id: null,
  lead: { id: "lead-1", full_name: "Lead One", phone: "+420000000000", email: null },
  preferred_operator: null,
}];

describe("recent context server source boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLeadActivities.mockResolvedValue(activities);
    mocks.listScheduledCallbacksForWorkspace.mockResolvedValue(callbacks);
  });

  it("returns serializable source states and preserves the available source", async () => {
    mocks.listScheduledCallbacksForWorkspace.mockRejectedValue(
      new DataAccessError("DATABASE", "Scheduled callbacks could not be loaded."),
    );

    const result = await loadRecentContextSourcesAction("lead-1");

    expect(result).toEqual({
      activities: { status: "ready", data: activities },
      callbacks: {
        status: "unavailable",
        reason: "database",
        message: "Scheduled callbacks could not be loaded.",
      },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("keeps verified empty data as ready with an empty array", async () => {
    mocks.getLeadActivities.mockResolvedValue([]);
    mocks.listScheduledCallbacksForWorkspace.mockResolvedValue([]);

    await expect(loadRecentContextSourcesAction("lead-empty")).resolves.toEqual({
      activities: { status: "ready", data: [] },
      callbacks: { status: "ready", data: [] },
    });
  });

  it.each(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT"] as const)(
    "rethrows %s instead of serializing it as unavailable",
    async (code) => {
      const failure = new DataAccessError(code, `${code} failure`);
      mocks.getLeadActivities.mockRejectedValue(failure);

      await expect(loadRecentContextSourcesAction("lead-1")).rejects.toBe(failure);
    },
  );

  it("rethrows unknown errors instead of weakening them", async () => {
    const failure = new Error("socket hang up");
    mocks.listScheduledCallbacksForWorkspace.mockRejectedValue(failure);

    await expect(loadRecentContextSourcesAction("lead-1")).rejects.toBe(failure);
  });
});
