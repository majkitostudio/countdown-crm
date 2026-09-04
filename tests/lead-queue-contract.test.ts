import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  dispatchWorkflowEventForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));

vi.mock("@/lib/workflows/dispatcher", () => ({
  dispatchWorkflowEventForWorkspace: mocks.dispatchWorkflowEventForWorkspace,
}));

import {
  abortLeadCallStartForWorkspace,
  completeLeadCallForWorkspace,
} from "@/lib/dal/leadQueue";

const workspaceContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "operator" as const,
};

const queueSnapshot = {
  queue_item_id: "queue-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  assignment_state: "assigned",
  assigned_operator_id: "user-1",
  preferred_operator_id: null,
  available_at: "2026-08-27T10:00:00.000Z",
  scheduled_at: null,
  attempt_count: 1,
  claimed_at: null,
  last_heartbeat_at: null,
  lease_expires_at: null,
  lead: {
    id: "lead-1",
    full_name: "Test Lead",
    phone: "+420000000000",
    email: "lead@example.com",
    status: "new",
    ai_score: 80,
  },
};

describe("lead queue server contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceRole.mockResolvedValue(workspaceContext);
    mocks.dispatchWorkflowEventForWorkspace.mockResolvedValue({ entries: [] });
  });

  it("rejects invalid completion input before touching authorization or RPC", async () => {
    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        duration_seconds: -1,
        outcome: "no_answer",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mocks.requireWorkspaceRole).not.toHaveBeenCalled();
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("requires at least one order item for an order outcome", async () => {
    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        duration_seconds: 30,
        outcome: "order_placed",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mocks.requireWorkspaceRole).not.toHaveBeenCalled();
  });

  it("routes call-start recovery to the authorized recovery RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: queueSnapshot, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(
      abortLeadCallStartForWorkspace("queue-1", "workspace unmounted during dialing"),
    ).resolves.toEqual(queueSnapshot);

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["operator"]);
    expect(rpc).toHaveBeenCalledWith("abort_lead_call_start", {
      target_queue_item_id: "queue-1",
      abort_reason: "workspace unmounted during dialing",
    });
  });

  it("maps a missing recovery assignment to a not-found error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(abortLeadCallStartForWorkspace("queue-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("passes completion fields to one server-authoritative RPC", async () => {
    const completion = { call_id: "call-1", order_id: null, queue_state: "completed" };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: queueSnapshot, error: null })
      .mockResolvedValueOnce({ data: completion, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        duration_seconds: 42,
        outcome: "followup_scheduled",
        transcript: "Follow up next week",
        ai_sentiment: "Positive",
        callback_scheduled_at: "2026-09-01T09:00:00.000Z",
      }),
    ).resolves.toMatchObject(completion);

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["operator"]);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(2, "complete_lead_call_with_order_items", {
      target_queue_item_id: "queue-1",
      call_duration_seconds: 42,
      call_outcome: "followup_scheduled",
      call_transcript: "Follow up next week",
      call_ai_sentiment: "Positive",
      order_items: null,
      callback_scheduled_at: "2026-09-01T09:00:00.000Z",
      call_note: null,
      call_fail_reason: null,
    });
  });

  it("forwards every checkout item to the atomic completion RPC", async () => {
    const completion = { call_id: "call-2", order_id: "order-2", queue_state: "completed" };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: queueSnapshot, error: null })
      .mockResolvedValueOnce({ data: completion, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });
    const orderItems = [
      { product_id: "product-1", quantity: 2, unit_price: 18.5 },
      { product_id: "product-2", quantity: 1, unit_price: 9.99 },
    ];

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        duration_seconds: 42,
        outcome: "order_placed",
        order_items: orderItems,
      }),
    ).resolves.toMatchObject(completion);

    expect(rpc).toHaveBeenNthCalledWith(2, "complete_lead_call_with_order_items", {
      target_queue_item_id: "queue-1",
      call_duration_seconds: 42,
      call_outcome: "order_placed",
      call_transcript: null,
      call_ai_sentiment: "Neutral",
      order_items: orderItems,
      callback_scheduled_at: null,
      call_note: null,
      call_fail_reason: null,
    });
  });

  it("preserves the RPC error as a database access error", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: queueSnapshot, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "assignment is no longer owned by this operator" },
      });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        duration_seconds: 42,
        outcome: "no_answer",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "DATABASE",
        message: "assignment is no longer owned by this operator",
      } satisfies Partial<DataAccessError>),
    );
  });
});
