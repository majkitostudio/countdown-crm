import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  getScopedLeadForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: mocks.requireWorkspaceContext }));
vi.mock("@/lib/dal/leadQueue", () => ({ getScopedLeadForWorkspace: mocks.getScopedLeadForWorkspace }));

import { createLeadNoteForWorkspace } from "@/lib/dal/leadNotes";

describe("operator lead-note assignment guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceContext.mockResolvedValue({
      userId: "operator-1",
      workspaceId: "workspace-1",
      role: "operator",
    });
    mocks.getScopedLeadForWorkspace.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "Contact unavailable"),
    );
  });

  it("blocks an operator from adding a note to a lead outside the current assignment", async () => {
    await expect(createLeadNoteForWorkspace("foreign-lead", "Blocked note"))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mocks.getScopedLeadForWorkspace).toHaveBeenCalledWith("foreign-lead", "workspace-1");
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });
});
