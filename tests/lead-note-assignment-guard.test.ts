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

  it("writes a note for the currently assigned operator contact without opening the lead directory", async () => {
    mocks.getScopedLeadForWorkspace.mockResolvedValue({ id: "assigned-lead" });
    const from = vi.fn((table: string) => {
      if (table === "lead_notes") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "note-1", workspace_id: "workspace-1", lead_id: "assigned-lead",
                  author_id: "operator-1", body: "Saved note", created_at: "2026-09-13T00:00:00Z",
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [{ id: "operator-1", full_name: "Operator One" }], error: null }),
          })),
        };
      }
      throw new Error(`Unexpected table lookup: ${table}`);
    });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(createLeadNoteForWorkspace("assigned-lead", "Saved note"))
      .resolves.toMatchObject({ lead_id: "assigned-lead", author_name: "Operator One" });

    expect(mocks.getScopedLeadForWorkspace).toHaveBeenCalledWith("assigned-lead", "workspace-1");
    expect(from).not.toHaveBeenCalledWith("leads");
  });
});
