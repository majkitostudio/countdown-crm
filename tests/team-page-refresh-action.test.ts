import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  listQueueItemsForWorkspace: vi.fn(),
  listWorkspaceOperators: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: mocks.requireWorkspaceContext }));
vi.mock("@/lib/dal/leadQueue", () => ({ listQueueItemsForWorkspace: mocks.listQueueItemsForWorkspace }));
vi.mock("@/lib/dal/memberships", () => ({
  listWorkspaceOperators: mocks.listWorkspaceOperators,
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

import * as actions from "@/app/actions/workspace";

// This action must execute the real composite loader; only its database/context boundaries are replaced.
async function refresh() {
  expect(actions).toHaveProperty("refreshTeamPageAction", expect.any(Function));
  return actions.refreshTeamPageAction();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceContext.mockResolvedValue({ userId: "admin-1", workspaceId: "current-workspace", role: "administrator" });
  mocks.listQueueItemsForWorkspace.mockResolvedValue([]);
  mocks.listWorkspaceOperators.mockResolvedValue([]);
  mocks.listWorkspaceMembers.mockResolvedValue([]);
});

describe("authenticated Team composite refresh", () => {
  it("reloads every administrator source in the current workspace and isolates DATABASE failures", async () => {
    mocks.listQueueItemsForWorkspace.mockRejectedValue(new DataAccessError("DATABASE", "queue failed"));
    mocks.listWorkspaceMembers.mockRejectedValue(new DataAccessError("DATABASE", "members failed"));

    await expect(refresh()).resolves.toEqual({
      queue: { status: "unavailable", reason: "database" },
      operators: { status: "ready", data: [] },
      members: { status: "unavailable", reason: "database" },
    });
    expect(mocks.requireWorkspaceContext).toHaveBeenCalledWith();
    expect(mocks.listQueueItemsForWorkspace).toHaveBeenCalledWith("current-workspace");
    expect(mocks.listWorkspaceOperators).toHaveBeenCalledWith("current-workspace");
    expect(mocks.listWorkspaceMembers).toHaveBeenCalledWith("current-workspace");
  });

  it("does not load administrator members during a Team Leader refresh", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({ userId: "leader-1", workspaceId: "current-workspace", role: "team_leader" });

    await expect(refresh()).resolves.toEqual({
      queue: { status: "ready", data: [] },
      operators: { status: "ready", data: [] },
      members: null,
    });
    expect(mocks.listWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("rejects an operator before requesting any source", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({ userId: "operator-1", workspaceId: "current-workspace", role: "operator" });

    await expect(refresh()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listQueueItemsForWorkspace).not.toHaveBeenCalled();
    expect(mocks.listWorkspaceOperators).not.toHaveBeenCalled();
    expect(mocks.listWorkspaceMembers).not.toHaveBeenCalled();
  });

  it("keeps a context lookup failure fatal even when its code is DATABASE", async () => {
    const error = new DataAccessError("DATABASE", "membership context failed");
    mocks.requireWorkspaceContext.mockRejectedValue(error);

    await expect(refresh()).rejects.toBe(error);
    expect(mocks.listQueueItemsForWorkspace).not.toHaveBeenCalled();
  });

  it.each([
    new DataAccessError("UNAUTHORIZED", "unauthorized"),
    new DataAccessError("FORBIDDEN", "forbidden"),
    new DataAccessError("NOT_FOUND", "not found"),
    new DataAccessError("VALIDATION", "validation"),
    new DataAccessError("CONFLICT", "conflict"),
    new Error("unknown refresh failure"),
  ])("keeps non-DATABASE source errors fatal: %s", async (error) => {
    mocks.listWorkspaceOperators.mockRejectedValue(error);

    await expect(refresh()).rejects.toBe(error);
  });
});
