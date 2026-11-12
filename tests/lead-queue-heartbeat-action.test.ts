import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  heartbeatLeadAssignmentForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  claimNextLeadForWorkspace: vi.fn(),
  abortLeadCallStartForWorkspace: vi.fn(),
  completeLeadCallForWorkspace: vi.fn(),
  endLeadCallForWorkspace: vi.fn(),
  getCurrentLeadForWorkspace: vi.fn(),
  getScopedLeadForWorkspace: vi.fn(),
  heartbeatLeadAssignmentForWorkspace: mocks.heartbeatLeadAssignmentForWorkspace,
  listQueueItemsForWorkspace: vi.fn(),
  reopenLeadAssignmentForWorkspace: vi.fn(),
  reassignLeadAssignmentForWorkspace: vi.fn(),
  releaseLeadAssignmentForWorkspace: vi.fn(),
  setOperatorPresenceForWorkspace: vi.fn(),
  startLeadCallForWorkspace: vi.fn(),
}));

import { heartbeatLeadAssignmentAction } from "@/app/actions/leadQueue";

describe("heartbeatLeadAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the lease update for an active session", async () => {
    const heartbeat = {
      queue_item_id: "queue-1",
      lease_expires_at: "2026-11-12T10:00:00.000Z",
    };
    mocks.heartbeatLeadAssignmentForWorkspace.mockResolvedValue(heartbeat);

    await expect(heartbeatLeadAssignmentAction("queue-1")).resolves.toEqual(heartbeat);
    expect(mocks.heartbeatLeadAssignmentForWorkspace).toHaveBeenCalledWith("queue-1");
  });

  it("treats a heartbeat without a valid session as a no-op", async () => {
    mocks.heartbeatLeadAssignmentForWorkspace.mockRejectedValue(new Error("Unauthorized"));

    await expect(heartbeatLeadAssignmentAction("queue-1")).resolves.toBeNull();
  });

  it("rethrows other heartbeat failures", async () => {
    const failure = new Error("database unavailable");
    mocks.heartbeatLeadAssignmentForWorkspace.mockRejectedValue(failure);

    await expect(heartbeatLeadAssignmentAction("queue-1")).rejects.toBe(failure);
  });
});
