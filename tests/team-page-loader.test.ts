import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  listQueueItemsForWorkspace: vi.fn(),
  listWorkspaceOperators: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listAccessibleTeams: vi.fn(),
  listSelectableWorkspaceTeams: vi.fn(),
  listTeamOperatorIds: vi.fn(),
  listTeamMemberships: vi.fn(),
  listOperatorPresenceForWorkspace: vi.fn(),
  loadTeamWorkspaceCheckpoint: vi.fn(),
  listCallQualityReviewsForWorkspace: vi.fn(),
  listAssistanceRequestsForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listQueueItemsForWorkspace: mocks.listQueueItemsForWorkspace,
}));
vi.mock("@/lib/dal/memberships", () => ({
  listWorkspaceOperators: mocks.listWorkspaceOperators,
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));
vi.mock("@/lib/dal/teams", () => ({
  listAccessibleTeams: mocks.listAccessibleTeams,
  listSelectableWorkspaceTeams: mocks.listSelectableWorkspaceTeams,
  listTeamOperatorIds: mocks.listTeamOperatorIds,
  listTeamMemberships: mocks.listTeamMemberships,
}));
vi.mock("@/lib/dal/operatorPresence", () => ({
  listOperatorPresenceForWorkspace: mocks.listOperatorPresenceForWorkspace,
}));
vi.mock("@/lib/dal/teamWorkspace", () => ({
  loadTeamWorkspaceCheckpoint: mocks.loadTeamWorkspaceCheckpoint,
}));
vi.mock("@/lib/dal/callQualityReviews", () => ({
  listCallQualityReviewsForWorkspace: mocks.listCallQualityReviewsForWorkspace,
}));
vi.mock("@/lib/dal/assistanceRequests", () => ({
  listAssistanceRequestsForWorkspace: mocks.listAssistanceRequestsForWorkspace,
}));

import { loadTeamPageData } from "@/lib/dal/teamPage";

const teamLeaderContext = {
  userId: "leader-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const administratorContext = {
  ...teamLeaderContext,
  role: "administrator" as const,
};

const emptyCheckpoint = {
  periodKey: "today",
  period: { from: "2026-09-16T00:00:00.000Z", to: "2026-09-17T00:00:00.000Z" },
  orders: [],
  overdueCallbacks: [],
  operatorMetrics: [],
  sources: {
    orders: { state: "ready" },
    calls: { state: "ready" },
    callbacks: { state: "ready" },
    activities: { state: "ready" },
    shifts: { state: "unavailable", message: "Shift planning is not implemented yet." },
  },
};

const defaultScope = {
  periodKey: "today",
  teamIds: [],
  selectableTeams: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listQueueItemsForWorkspace.mockResolvedValue([]);
  mocks.listWorkspaceOperators.mockResolvedValue([]);
  mocks.listWorkspaceMembers.mockResolvedValue([]);
  mocks.listAccessibleTeams.mockResolvedValue([]);
  mocks.listSelectableWorkspaceTeams.mockResolvedValue([]);
  mocks.listTeamOperatorIds.mockResolvedValue([]);
  mocks.listTeamMemberships.mockResolvedValue([]);
  mocks.listOperatorPresenceForWorkspace.mockResolvedValue([]);
  mocks.loadTeamWorkspaceCheckpoint.mockResolvedValue(emptyCheckpoint);
  mocks.listCallQualityReviewsForWorkspace.mockResolvedValue([]);
  mocks.listAssistanceRequestsForWorkspace.mockResolvedValue([]);
});

describe("loadTeamPageData", () => {
  it.each([
    {
      name: "marks the queue unavailable when its database source fails",
      setup: () => mocks.listQueueItemsForWorkspace.mockRejectedValue(
        new DataAccessError("DATABASE", "queue database failed"),
      ),
      context: teamLeaderContext,
      expected: {
        queue: { status: "unavailable", reason: "database" },
        operators: { status: "ready", data: [] },
        presence: { status: "ready", data: [] },
        roster: { status: "ready", data: { teams: [], memberships: {} } },
        members: null,
      },
    },
    {
      name: "marks operators unavailable when their database source fails",
      setup: () => mocks.listWorkspaceOperators.mockRejectedValue(
        new DataAccessError("DATABASE", "operators database failed"),
      ),
      context: teamLeaderContext,
      expected: {
        queue: { status: "ready", data: [] },
        operators: { status: "unavailable", reason: "database" },
        presence: { status: "ready", data: [] },
        roster: { status: "ready", data: { teams: [], memberships: {} } },
        members: null,
      },
    },
    {
      name: "preserves queue and operators when administrator members fail in the database",
      setup: () => mocks.listWorkspaceMembers.mockRejectedValue(
        new DataAccessError("DATABASE", "members database failed"),
      ),
      context: administratorContext,
      expected: {
        queue: { status: "ready", data: [] },
        operators: { status: "ready", data: [] },
        presence: { status: "ready", data: [] },
        roster: { status: "ready", data: { teams: [], memberships: {} } },
        members: { status: "unavailable", reason: "database" },
      },
    },
  ])("$name", async ({ setup, context, expected }) => {
    setup();

    await expect(loadTeamPageData(context)).resolves.toEqual({
          ...expected,
          checkpoint: { status: "ready", data: emptyCheckpoint },
          qualityReviews: { status: "ready", data: [] },
          assistanceRequests: { status: "ready", data: [] },
          scope: defaultScope,
        });
  });

  it("reports queue and operators independently unavailable when both database reads fail", async () => {
    mocks.listQueueItemsForWorkspace.mockRejectedValue(new DataAccessError("DATABASE", "queue failed"));
    mocks.listWorkspaceOperators.mockRejectedValue(new DataAccessError("DATABASE", "operators failed"));

    await expect(loadTeamPageData(administratorContext)).resolves.toEqual({
      queue: { status: "unavailable", reason: "database" },
      operators: { status: "unavailable", reason: "database" },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: { status: "ready", data: [] },
      checkpoint: { status: "ready", data: emptyCheckpoint },
      qualityReviews: { status: "ready", data: [] },
      assistanceRequests: { status: "ready", data: [] },
      scope: defaultScope,
    });
  });

  it("preserves verified empty data as ready sources", async () => {
    await expect(loadTeamPageData(administratorContext)).resolves.toEqual({
      queue: { status: "ready", data: [] },
      operators: { status: "ready", data: [] },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: { status: "ready", data: [] },
      checkpoint: { status: "ready", data: emptyCheckpoint },
      qualityReviews: { status: "ready", data: [] },
      assistanceRequests: { status: "ready", data: [] },
      scope: defaultScope,
    });
  });

  it("does not request members for a team leader", async () => {
    await expect(loadTeamPageData(teamLeaderContext)).resolves.toMatchObject({
      members: null,
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
    });

    expect(mocks.listWorkspaceMembers).not.toHaveBeenCalled();
    expect(mocks.loadTeamWorkspaceCheckpoint).toHaveBeenCalledWith(teamLeaderContext, { periodKey: "today", operatorIds: [] });
  });

  it("passes the supplied workspace ID to every administrator source", async () => {
    await loadTeamPageData(administratorContext);

    expect(mocks.listQueueItemsForWorkspace).toHaveBeenCalledWith("workspace-1", {});
    expect(mocks.listWorkspaceOperators).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listSelectableWorkspaceTeams).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listOperatorPresenceForWorkspace).toHaveBeenCalledWith("workspace-1", {});
    expect(mocks.listAccessibleTeams).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listWorkspaceMembers).toHaveBeenCalledWith("workspace-1");
  });

  it.each([
    new DataAccessError("UNAUTHORIZED", "unauthorized"),
    new DataAccessError("FORBIDDEN", "forbidden"),
    new DataAccessError("NOT_FOUND", "not found"),
    new DataAccessError("VALIDATION", "validation"),
    new DataAccessError("CONFLICT", "conflict"),
    new Error("unexpected source failure"),
  ])("preserves a non-database source rejection: %s", async (error) => {
    mocks.listQueueItemsForWorkspace.mockRejectedValue(error);

    await expect(loadTeamPageData(teamLeaderContext)).rejects.toBe(error);
  });

  it("rejects an unauthorized supplied context before requesting any source", async () => {
    await expect(loadTeamPageData({ ...teamLeaderContext, role: "operator" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Insufficient workspace permissions",
    });
    expect(mocks.listQueueItemsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listWorkspaceOperators).not.toHaveBeenCalled();
    expect(mocks.listWorkspaceMembers).not.toHaveBeenCalled();
    expect(mocks.listOperatorPresenceForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listAccessibleTeams).not.toHaveBeenCalled();
  });

  it("rejects a team selection outside the selectable teams before requesting any source", async () => {
    mocks.listSelectableWorkspaceTeams.mockResolvedValue([
      { id: "team-a", name: "Tým A", workspace_id: "workspace-1", slug: "tym-a", status: "active", created_at: "", updated_at: "" },
    ]);

    await expect(loadTeamPageData(teamLeaderContext, { teamIds: ["team-z"] })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "A selected team is not within the accessible team scope.",
    });
    expect(mocks.listQueueItemsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.loadTeamWorkspaceCheckpoint).not.toHaveBeenCalled();
    expect(mocks.listOperatorPresenceForWorkspace).not.toHaveBeenCalled();
  });

  it("honours the requested period key on the checkpoint source", async () => {
    mocks.listSelectableWorkspaceTeams.mockResolvedValue([
      { id: "team-a", name: "Tým A", workspace_id: "workspace-1", slug: "tym-a", status: "active", created_at: "", updated_at: "" },
    ]);

    await loadTeamPageData(teamLeaderContext, { periodKey: "week" });

    expect(mocks.loadTeamWorkspaceCheckpoint).toHaveBeenCalledWith(teamLeaderContext, { periodKey: "week", operatorIds: [] });
  });

  it("threads a strict team subset into every team-scoped source", async () => {
    mocks.listSelectableWorkspaceTeams.mockResolvedValue([
      { id: "team-a", name: "Tým A", workspace_id: "workspace-1", slug: "tym-a", status: "active", created_at: "", updated_at: "" },
      { id: "team-b", name: "Tým B", workspace_id: "workspace-1", slug: "tym-b", status: "active", created_at: "", updated_at: "" },
    ]);
    mocks.listTeamOperatorIds.mockResolvedValue(["operator-1"]);
    mocks.listWorkspaceOperators.mockResolvedValue([
      { workspace_id: "workspace-1", user_id: "operator-1", role: "operator", full_name: "Alena", email: "a@example.test", avatar_url: null, created_at: "", updated_at: "" },
      { workspace_id: "workspace-1", user_id: "operator-2", role: "operator", full_name: "Boris", email: "b@example.test", avatar_url: null, created_at: "", updated_at: "" },
    ]);
    mocks.listAccessibleTeams.mockResolvedValue([
      { id: "team-a", name: "Tým A", workspace_id: "workspace-1", slug: "tym-a", status: "active", created_at: "", updated_at: "" },
      { id: "team-b", name: "Tým B", workspace_id: "workspace-1", slug: "tym-b", status: "active", created_at: "", updated_at: "" },
    ]);

    const data = await loadTeamPageData(teamLeaderContext, { teamIds: ["team-a"] });

    expect(mocks.listTeamOperatorIds).toHaveBeenCalledWith("workspace-1", ["team-a"]);
    expect(mocks.loadTeamWorkspaceCheckpoint).toHaveBeenCalledWith(teamLeaderContext, { periodKey: "today", operatorIds: ["operator-1"] });
    expect(mocks.listQueueItemsForWorkspace).toHaveBeenCalledWith("workspace-1", { teamIds: ["team-a"] });
    expect(mocks.listOperatorPresenceForWorkspace).toHaveBeenCalledWith("workspace-1", { operatorIds: ["operator-1"] });
    expect(mocks.listCallQualityReviewsForWorkspace).toHaveBeenCalledWith("workspace-1", { operatorIds: ["operator-1"] });
    expect(data.operators).toEqual({ status: "ready", data: [
      { workspace_id: "workspace-1", user_id: "operator-1", role: "operator", full_name: "Alena", email: "a@example.test", avatar_url: null, created_at: "", updated_at: "" },
    ] });
    expect(data.roster).toEqual({ status: "ready", data: { teams: [
      { id: "team-a", name: "Tým A", workspace_id: "workspace-1", slug: "tym-a", status: "active", created_at: "", updated_at: "" },
    ], memberships: { "team-a": [] } } });
    expect(data.scope).toEqual({ periodKey: "today", teamIds: ["team-a"], selectableTeams: [
      { id: "team-a", name: "Tým A" },
      { id: "team-b", name: "Tým B" },
    ] });
  });

  it("keeps the whole page on the default scope when a database read for selectable teams fails", async () => {
    mocks.listSelectableWorkspaceTeams.mockRejectedValue(new DataAccessError("DATABASE", "selectable failed"));

    await expect(loadTeamPageData(teamLeaderContext)).resolves.toMatchObject({
      scope: defaultScope,
      operators: { status: "ready", data: [] },
    });
    expect(mocks.loadTeamWorkspaceCheckpoint).toHaveBeenCalledWith(teamLeaderContext, { periodKey: "today", operatorIds: [] });
  });
});
