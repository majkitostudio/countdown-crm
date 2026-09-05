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
const callSessionId = "11111111-1111-4111-8111-111111111111";

describe("post-call completion runtime contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceRole.mockResolvedValue(context);
    mocks.requireWorkspaceContext.mockResolvedValue(context);
    mocks.dispatchWorkflowEventForWorkspace.mockResolvedValue({ entries: [], status: "success" });
  });

  it("forwards one durable idempotent queue boundary with callback and fail fields", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: { call_id: "call-1", order_id: null, queue_state: "waiting_callback", duration_seconds: 60, next_lead: null, lead_id: "lead-1", lead_name: "Test Lead" },
        error: null,
      });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await completeLeadCallForWorkspace({
      queue_item_id: "queue-1",
      call_session_id: callSessionId,
      duration_seconds: 60,
      outcome: "followup_scheduled",
      callback_scheduled_at: "2026-09-06T10:00:00.000Z",
      operator_note: "Call back tomorrow.",
      fail_reason: null,
    });

    expect(rpc).toHaveBeenCalledWith("complete_lead_call_with_order_items_idempotent", {
      completion_key: callSessionId,
      target_queue_item_id: "queue-1",
      call_session_id: callSessionId,
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

  it("rejects malformed untrusted text without throwing a TypeError", async () => {
    await expect(completeCallForWorkspace({
      lead_id: "lead-1",
      call_session_id: 42,
      duration_seconds: 30,
      outcome: "no_answer",
      operator_note: { trim: "not a function" },
    } as unknown as Parameters<typeof completeCallForWorkspace>[0])).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("replays a duplicate queue submission with the same attempt identity", async () => {
    const completion = { call_id: "call-duplicate", order_id: null, queue_state: "closed", lead_id: "lead-1", lead_name: "Test Lead" };
    const rpc = vi.fn().mockResolvedValue({ data: completion, error: null });
    mocks.createDataClient.mockResolvedValue({ rpc });
    const input = {
      queue_item_id: "queue-1",
      call_session_id: callSessionId,
      duration_seconds: 45,
      outcome: "no_answer" as const,
    };

    await expect(completeLeadCallForWorkspace(input)).resolves.toMatchObject(completion);
    await expect(completeLeadCallForWorkspace(input)).resolves.toMatchObject(completion);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][1]).toMatchObject({ completion_key: callSessionId, call_session_id: callSessionId });
    expect(rpc.mock.calls[1][1]).toMatchObject({ completion_key: callSessionId, call_session_id: callSessionId });
  });

  it("surfaces a server-side payload conflict instead of retrying under a new key", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Completion request key was reused with a different payload" },
    });
    mocks.createDataClient.mockResolvedValue({ rpc });

    await expect(completeLeadCallForWorkspace({
      queue_item_id: "queue-1",
      call_session_id: callSessionId,
      duration_seconds: 46,
      outcome: "no_answer",
    })).rejects.toMatchObject({
      code: "DATABASE",
      message: "Completion request key was reused with a different payload",
    });
    expect(rpc.mock.calls[0][1]).toMatchObject({ completion_key: callSessionId });
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
