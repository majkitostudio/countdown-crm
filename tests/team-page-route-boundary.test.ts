import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  loadTeamPageData: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/dal/teamPage", () => ({
  loadTeamPageData: mocks.loadTeamPageData,
}));

import TeamPage from "@/app/team/page";

describe("TeamPage route boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceContext.mockResolvedValue({
      userId: "leader-1",
      workspaceId: "workspace-1",
      role: "team_leader",
    });
  });

  it("rethrows an unexpected loader failure for an authorized Team Leader", async () => {
    const fatalError = new Error("unexpected team loader failure");
    mocks.loadTeamPageData.mockRejectedValue(fatalError);

    await expect(TeamPage()).rejects.toBe(fatalError);
  });
});
