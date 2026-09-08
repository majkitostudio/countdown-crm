import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  listQueueItemsForWorkspace: vi.fn(),
  listWorkspaceOperators: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listQueueItemsForWorkspace: mocks.listQueueItemsForWorkspace,
}));
vi.mock("@/lib/dal/memberships", () => ({
  listWorkspaceOperators: mocks.listWorkspaceOperators,
  listWorkspaceMembers: mocks.listWorkspaceMembers,
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listQueueItemsForWorkspace.mockResolvedValue([]);
  mocks.listWorkspaceOperators.mockResolvedValue([]);
  mocks.listWorkspaceMembers.mockResolvedValue([]);
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
        queue: { state: "unavailable", message: "Lead queue is unavailable." },
        operators: { state: "available", data: [] },
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
        queue: { state: "available", data: [] },
        operators: { state: "unavailable", message: "Workspace operators are unavailable." },
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
        queue: { state: "available", data: [] },
        operators: { state: "available", data: [] },
        members: { state: "unavailable", message: "Workspace members are unavailable." },
      },
    },
  ])("$name", async ({ setup, context, expected }) => {
    setup();

    await expect(loadTeamPageData(context)).resolves.toEqual(expected);
  });

  it("does not request members for a team leader", async () => {
    await expect(loadTeamPageData(teamLeaderContext)).resolves.toMatchObject({
      members: null,
    });

    expect(mocks.listWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("passes the supplied workspace ID to every administrator source", async () => {
    await loadTeamPageData(administratorContext);

    expect(mocks.listQueueItemsForWorkspace).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listWorkspaceOperators).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listWorkspaceMembers).toHaveBeenCalledWith("workspace-1");
  });

  it.each([
    new DataAccessError("FORBIDDEN", "forbidden"),
    new DataAccessError("VALIDATION", "validation"),
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
  });
});
