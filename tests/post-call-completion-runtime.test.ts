import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  dispatchWorkflowEventForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/workflows/dispatcher", () => ({
  dispatchWorkflowEventForWorkspace: mocks.dispatchWorkflowEventForWorkspace,
}));

import { completeLeadCallForWorkspace } from "@/lib/dal/leadQueue";
import { completeCallForWorkspace } from "@/lib/dal/callCompletion";
import { createPostCallRetry } from "@/lib/postCallCompletion";

const context = { userId: "user-1", workspaceId: "workspace-1", role: "operator" as const };
const snapshot = {
  queue_item_id: "queue-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  assignment_state: "awaiting_outcome",
  assigned_operator_id: "user-1",
  preferred_operator_id: null,
  available_at: "2026-09-05T10:00:00.000Z",
  scheduled_at: null,
  attempt_count: 1,
  claimed_at: null,
  last_heartbeat_at: null,
  lease_expires_at: null,
  call_started_at: "2026-09-05T09:59:00.000Z",
  call_ended_at: "2026-09-05T10:00:00.000Z",
  recovery_required: false,
  lead: { id: "lead-1", full_name: "Test Lead", phone: "+420000000000", email: null, status: "new", ai_score: 80 },
};

describe("post-call completion runtime contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceRole.mockResolvedValue(context);
    mocks.requireWorkspaceContext.mockResolvedValue(context);
    mocks.dispatchWorkflowEventForWorkspace.mockResolvedValue({ entries: [], status: "success" });
  });

  it("forwards one durable idempotent queue boundary with callback and fail fields", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: snapshot, error: null })
      .mockResolvedValueOnce({
        data: { call_id: "call-1", order_id: null, queue_state: "waiting_callback", duration_seconds: 60, next_lead: null },
        error: null,
      });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await completeLeadCallForWorkspace({
      queue_item_id: "queue-1",
      duration_seconds: 60,
      outcome: "followup_scheduled",
      callback_scheduled_at: "2026-09-06T10:00:00.000Z",
      operator_note: "Call back tomorrow.",
      fail_reason: null,
    });

    expect(rpc).toHaveBeenNthCalledWith(2, "complete_lead_call_with_order_items_idempotent", {
      completion_key: "queue-1",
      target_queue_item_id: "queue-1",
      call_duration_seconds: 60,
      call_outcome: "followup_scheduled",
      call_transcript: null,
      call_ai_sentiment: "Neutral",
      order_items: null,
      callback_scheduled_at: "2026-09-06T10:00:00.000Z",
      call_note: "Call back tomorrow.",
      call_fail_reason: null,
    });
  });

  it("rejects a direct completion without a server-authorized session identity", async () => {
    await expect(completeCallForWorkspace({
      lead_id: "lead-1",
      duration_seconds: 30,
      outcome: "no_answer",
    } as unknown as Parameters<typeof completeCallForWorkspace>[0])).rejects.toMatchObject({ code: "VALIDATION" });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("retries the exact failed completion payload and identity", async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error("transient")).mockResolvedValueOnce("saved");
    const retry = createPostCallRetry(execute, {
      callSessionId: "session-1",
      outcome: "no_answer",
      note: "Try again",
    });

    await expect(retry()).rejects.toThrow("transient");
    await expect(retry()).resolves.toBe("saved");
    expect(execute).toHaveBeenNthCalledWith(1, {
      callSessionId: "session-1",
      outcome: "no_answer",
      note: "Try again",
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      callSessionId: "session-1",
      outcome: "no_answer",
      note: "Try again",
    });
  });
});
