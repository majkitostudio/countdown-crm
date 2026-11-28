import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  dispatchWorkflowEventForWorkspace: vi.fn(),
  reviewCompletedCallForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));

vi.mock("@/lib/workflows/dispatcher", () => ({
  dispatchWorkflowEventForWorkspace: mocks.dispatchWorkflowEventForWorkspace,
}));
vi.mock("@/lib/dal/callQualityReviews", () => ({
  reviewCompletedCallForWorkspace: mocks.reviewCompletedCallForWorkspace,
}));

import {
  abortLeadCallStartForWorkspace,
  completeLeadCallForWorkspace,
  getLiveCallAssignmentForWorkspace,
  listScheduledCallsForWorkspace,
} from "@/lib/dal/leadQueue";

const workspaceContext = {
  userId: "user-1",
  workspaceId: "workspace-1",
  role: "operator" as const,
};

const callSessionId = "11111111-1111-4111-8111-111111111111";
const deliveryAddress = {
  recipient_name: "Test Lead",
  line1: "Main 1",
  city: "Prague",
  postal_code: "110 00",
  country: "CZ",
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

function createPublishedScriptClient(rpc: ReturnType<typeof vi.fn>, productIds: string[]) {
  const query = (data: unknown[]) => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      then: (resolve: (result: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null })),
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    return builder;
  };

  return {
    rpc,
    from: vi.fn((table: string) => query(
      table === "products"
        ? productIds.map((id) => ({ id }))
        : productIds.map((product_id) => ({ product_id })),
    )),
  };
}

describe("lead queue server contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceRole.mockResolvedValue(workspaceContext);
    mocks.requireWorkspaceContext.mockResolvedValue(workspaceContext);
    mocks.dispatchWorkflowEventForWorkspace.mockResolvedValue({ entries: [] });
  });

  it("reads the operator's live assignment without invoking recovery", async () => {
    const row = { ...queueSnapshot, id: "queue-1", state: "in_progress", call_started_at: "2026-11-28T10:00:00Z", call_ended_at: null, recovery_required: false };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) };
    const rpc = vi.fn().mockResolvedValue({ data: queueSnapshot.lead, error: null });
    mocks.createDataClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query), rpc });

    const result = await getLiveCallAssignmentForWorkspace("queue-1", "lead-1");

    expect(result.assignment_state).toBe("in_progress");
    expect(query.eq).toHaveBeenCalledWith("assigned_operator_id", workspaceContext.userId);
    expect(query.eq).toHaveBeenCalledWith("workspace_id", workspaceContext.workspaceId);
    expect(query.eq).toHaveBeenCalledWith("state", "in_progress");
    expect(rpc).not.toHaveBeenCalledWith("get_current_lead", expect.anything());
  });

  it("does not fall back to recovery when a live assignment cannot be verified", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    const rpc = vi.fn();
    mocks.createDataClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query), rpc });
    await expect(getLiveCallAssignmentForWorkspace("queue-1", "lead-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid completion input after authorization but before touching the data client", async () => {
    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        call_session_id: callSessionId,
        duration_seconds: -1,
        outcome: "no_answer",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["operator"]);
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("requires at least one order item for an order outcome", async () => {
    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        call_session_id: callSessionId,
        duration_seconds: 30,
        outcome: "order_placed",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["operator"]);
    expect(mocks.createDataClient).not.toHaveBeenCalled();
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
    const rpc = vi.fn().mockResolvedValueOnce({ data: { ...completion, lead_id: "lead-1", lead_name: "Test Lead" }, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        call_session_id: callSessionId,
        duration_seconds: 42,
        outcome: "followup_scheduled",
        transcript: "Follow up next week",
        ai_sentiment: "Positive",
        scheduled_at: "2026-09-01T09:00:00.000Z",
      }),
    ).resolves.toMatchObject(completion);

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["operator"]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("complete_lead_call_with_order_items_idempotent", {
      completion_key: callSessionId,
      target_queue_item_id: "queue-1",
      call_session_id: callSessionId,
      call_duration_seconds: 42,
      call_outcome: "followup_scheduled",
      call_transcript: "Follow up next week",
      call_ai_sentiment: "Positive",
      order_items: null,
      delivery_address_snapshot: null,
      scheduled_at: "2026-09-01T09:00:00.000Z",
      call_note: null,
      call_fail_reason: null,
    });
  });

  it("forwards every checkout item to the atomic completion RPC", async () => {
    const completion = { call_id: "call-2", order_id: "order-2", queue_state: "completed" };
    const rpc = vi.fn().mockResolvedValueOnce({ data: { ...completion, lead_id: "lead-1", lead_name: "Test Lead" }, error: null });
    mocks.createDataClient.mockResolvedValue(createPublishedScriptClient(rpc, ["product-1", "product-2"]));
    const orderItems = [
      { product_id: "product-1", quantity: 2, unit_price: 18.5 },
      { product_id: "product-2", quantity: 1, unit_price: 9.99 },
    ];

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        call_session_id: callSessionId,
        duration_seconds: 42,
        outcome: "order_placed",
        order_items: orderItems,
        delivery_address_snapshot: deliveryAddress,
      }),
    ).resolves.toMatchObject(completion);

    expect(rpc).toHaveBeenCalledWith("complete_lead_call_with_order_items_idempotent", {
      completion_key: callSessionId,
      target_queue_item_id: "queue-1",
      call_session_id: callSessionId,
      call_duration_seconds: 42,
      call_outcome: "order_placed",
      call_transcript: null,
      call_ai_sentiment: "Neutral",
      order_items: orderItems,
      delivery_address_snapshot: deliveryAddress,
      scheduled_at: null,
      call_note: null,
      call_fail_reason: null,
    });
  });

  it("preserves the RPC error as a database access error", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: "assignment is no longer owned by this operator" },
      });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(
      completeLeadCallForWorkspace({
        queue_item_id: "queue-1",
        call_session_id: callSessionId,
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

  it("merges queue and direct-call scheduled calls into one canonical read model", async () => {
    const createQuery = (result: unknown) => {
      const query: Record<string, unknown> = {
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      };
      for (const method of ["select", "eq", "not", "gte", "lte", "order"]) {
        query[method] = vi.fn(() => query);
      }
      return query;
    };
    const queueQuery = createQuery({
      data: [{
        id: "queue-scheduledCall",
        workspace_id: "workspace-1",
        lead_id: "lead-1",
        scheduled_at: "2026-09-06T10:00:00.000Z",
        preferred_operator_id: "user-1",
        lead: { id: "lead-1", full_name: "Queue Lead", phone: "+4201", email: null },
        preferred_operator: null,
      }],
      error: null,
    });
    const directQuery = createQuery({
      data: [{
        id: "direct-call",
        workspace_id: "workspace-1",
        lead_id: "lead-2",
        agent_id: "user-1",
        scheduled_at: "2026-09-05T10:00:00.000Z",
        lead: { id: "lead-2", full_name: "Direct Lead", phone: "+4202", email: null },
      }],
      error: null,
    });
    mocks.createDataClient.mockResolvedValue({
      from: vi.fn()
        .mockReturnValueOnce(queueQuery)
        .mockReturnValueOnce(directQuery),
    });

    await expect(listScheduledCallsForWorkspace(
      "2026-09-05T00:00:00.000Z",
      "2026-09-07T00:00:00.000Z",
    )).resolves.toMatchObject([
      { id: "direct-call", preferred_operator_id: "user-1", scheduled_at: "2026-09-05T10:00:00.000Z" },
      { id: "queue-scheduledCall", preferred_operator_id: "user-1", scheduled_at: "2026-09-06T10:00:00.000Z" },
    ]);
  });
});
