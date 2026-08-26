import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateWorkflowEvent } from "@/lib/workflows/evaluator";
import { TRIGGER_REGISTRY, type ExecutionLogEntry, type WorkflowRule } from "@/lib/workflows/types";

const baseRule: WorkflowRule = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Truth contract test",
  enabled: true,
  trigger: "on_call_ended",
  conditions: [],
  actions: [],
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
};

const payload = { callId: "call-1", leadId: "lead-1", outcome: "order_placed" };

function ruleWithActions(actions: WorkflowRule["actions"]): WorkflowRule {
  return { ...baseRule, actions };
}

function options(overrides: Partial<Parameters<typeof evaluateWorkflowEvent>[3]> = {}) {
  return {
    mode: "server" as const,
    eventId: "call-1",
    persist: vi.fn<(entry: ExecutionLogEntry) => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("truthful workflow execution contract", () => {
  it("marks console/provider-only actions unavailable instead of success", async () => {
    const result = await evaluateWorkflowEvent(
      [ruleWithActions([
        { type: "compute_ai_summary", config: {} },
        { type: "send_email_followup", config: {} },
        { type: "update_lead_status", config: { target_status: "customer" } },
        { type: "notify_manager", config: { message: "{{leadId}}" } },
      ])],
      "on_call_ended",
      payload,
      options(),
    );

    expect(result.status).toBe("unavailable");
    expect(result.entries[0].status).toBe("unavailable");
    expect(result.entries[0].durableEffect).toBe(false);
    expect(result.entries[0].actionResults.map((item) => item.status)).toEqual([
      "unavailable",
      "unavailable",
      "unavailable",
      "unavailable",
    ]);
  });

  it("distinguishes webhook configuration, transport, HTTP, and success outcomes", async () => {
    const missing = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: {} }])],
      "on_call_ended",
      payload,
      options(),
    );
    expect(missing.status).toBe("failure");
    expect(missing.entries[0].actionResults[0].reason).toContain("missing");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const transport = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: { webhook_url: "https://example.test/hook" } }])],
      "on_call_ended",
      payload,
      options({ eventId: "call-transport" }),
    );
    expect(transport.status).toBe("failure");
    expect(transport.entries[0].actionResults[0].reason).toContain("network down");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 500 })));
    const httpFailure = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: { webhook_url: "https://example.test/hook" } }])],
      "on_call_ended",
      payload,
      options({ eventId: "call-http" }),
    );
    expect(httpFailure.status).toBe("failure");
    expect(httpFailure.entries[0].actionResults[0].reason).toContain("HTTP 500");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const success = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: { webhook_url: "https://example.test/hook" } }])],
      "on_call_ended",
      payload,
      options({ eventId: "call-success" }),
    );
    expect(success.status).toBe("success");
    expect(success.entries[0].executedActions).toEqual(["send_webhook"]);
    expect(success.entries[0].durableEffect).toBe(true);
  });

  it("marks manual emit as simulation and never calls the webhook", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await evaluateWorkflowEvent(
      [ruleWithActions([
        { type: "send_webhook", config: { webhook_url: "https://example.test/hook" } },
        { type: "compute_ai_summary", config: {} },
      ])],
      "on_call_ended",
      payload,
      options({ mode: "simulation", eventId: "manual-test-1" }),
    );

    expect(result.status).toBe("simulation");
    expect(result.durableEffect).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.entries[0].actionResults.every((item) => item.status === "simulation")).toBe(true);
  });

  it("surfaces execution-log persistence failure as a failed execution", async () => {
    const result = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: { webhook_url: "https://example.test/hook" } }])],
      "on_call_ended",
      payload,
      options({
        persist: vi.fn().mockRejectedValue(new Error("database unavailable")),
      }),
    );

    expect(result.status).toBe("failure");
    expect(result.entries[0].persistenceStatus).toBe("failed");
    expect(result.entries[0].errorMessage).toContain("database unavailable");
  });

  it("does not execute or persist a duplicate event already found by the server", async () => {
    const existing: ExecutionLogEntry = {
      id: "00000000-0000-4000-8000-000000000002",
      ruleId: baseRule.id,
      ruleName: baseRule.name,
      trigger: baseRule.trigger,
      status: "success",
      executedActions: ["send_webhook"],
      actionResults: [{ action: "send_webhook", status: "success", reason: "already persisted", durableEffect: true }],
      eventPayload: payload,
      eventId: "call-1",
      durableEffect: true,
      persistenceStatus: "persisted",
      executedAt: "2026-08-26T00:00:00.000Z",
    };
    const persist = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await evaluateWorkflowEvent(
      [ruleWithActions([{ type: "send_webhook", config: { webhook_url: "https://example.test/hook" } }])],
      "on_call_ended",
      payload,
      options({
        persist,
        findExisting: vi.fn().mockResolvedValue(existing),
      }),
    );

    expect(result.entries).toEqual([existing]);
    expect(persist).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("workflow trigger availability", () => {
  it("does not present unwired business events as production-supported", () => {
    expect(TRIGGER_REGISTRY.find((item) => item.type === "on_call_ended")?.serverDispatch).toBe("supported");
    for (const trigger of ["on_order_placed", "on_lead_status_changed", "on_lead_created"] as const) {
      expect(TRIGGER_REGISTRY.find((item) => item.type === trigger)).toMatchObject({ serverDispatch: "unavailable" });
    }
  });
});
