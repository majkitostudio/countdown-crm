import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

import {
  buildTeamLeaderExceptionQueue,
  listTeamLeaderExceptions,
  resolveException,
  snoozeException,
  type ExceptionQueueSourcesInput,
} from "@/lib/dal/exceptionQueue";

const now = new Date("2026-09-06T10:00:00.000Z");

const sources: ExceptionQueueSourcesInput = {
  queueItems: {
    status: "fulfilled",
    value: [
      {
        id: "queue-recovery",
        lead_id: "lead-recovery",
        state: "awaiting_outcome",
        assigned_operator_id: "operator-1",
        preferred_operator_id: null,
        scheduled_at: null,
        lease_expires_at: "2026-09-06T09:30:00.000Z",
        recovery_required: true,
        updated_at: "2026-09-06T09:31:00.000Z",
        lead: { full_name: "Recovery Customer" },
        assigned_operator: { full_name: "Jan Operator" },
        preferred_operator: null,
      },
      {
        id: "queue-callback",
        lead_id: "lead-callback",
        state: "waiting_callback",
        assigned_operator_id: null,
        preferred_operator_id: "operator-2",
        scheduled_at: "2026-09-06T08:00:00.000Z",
        lease_expires_at: null,
        recovery_required: false,
        updated_at: "2026-09-06T08:00:00.000Z",
        lead: { full_name: "Callback Customer" },
        assigned_operator: null,
        preferred_operator: { full_name: "Eva Operator" },
      },
      {
        id: "queue-lease",
        lead_id: "lead-lease",
        state: "assigned",
        assigned_operator_id: "operator-3",
        preferred_operator_id: null,
        scheduled_at: null,
        lease_expires_at: "2026-09-06T09:00:00.000Z",
        recovery_required: false,
        updated_at: "2026-09-06T09:00:00.000Z",
        lead: { full_name: "Lease Customer" },
        assigned_operator: { full_name: "Petr Operator" },
        preferred_operator: null,
      },
    ],
  },
  workflowExecutions: {
    status: "fulfilled",
    value: [{
      id: "workflow-failure",
      rule_id: "workflow-1",
      status: "failure",
      created_at: "2026-09-06T09:45:00.000Z",
      logs: { error: "Provider rejected the request" },
      workflow: { name: "Call follow-up" },
    }],
  },
  products: {
    status: "fulfilled",
    value: [
      { id: "product-missing", title: "Product without script", in_stock: true, created_at: "2026-09-01T08:00:00.000Z" },
      { id: "product-ready", title: "Product with script", in_stock: true, created_at: "2026-09-01T08:00:00.000Z" },
    ],
  },
  productScripts: {
    status: "fulfilled",
    value: [{ product_id: "product-ready" }],
  },
  actions: { status: "fulfilled", value: [] },
  callSessions: {
    status: "fulfilled",
    value: [{ queue_item_id: "queue-recovery", completed_call_id: "call-a" }],
  },
};

function queryResult(data: unknown, error: unknown = null) {
  const promise = Promise.resolve({ data, error });
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    then: promise.then.bind(promise),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({
    userId: "manager-1",
    workspaceId: "workspace-1",
    role: "team_leader",
  });
});

describe("Team Leader Exception Queue", () => {
  it("turns only recorded operational problems into prioritized actions", () => {
    const result = buildTeamLeaderExceptionQueue(sources, now);

    expect(result.items.map((item) => ({ id: item.id, type: item.type, priority: item.priority }))).toEqual([
      { id: "queue:outcome_recovery:queue-recovery", type: "outcome_recovery", priority: "critical" },
      { id: "queue:overdue_callback:queue-callback", type: "overdue_callback", priority: "high" },
      { id: "queue:expired_lease:queue-lease", type: "expired_lease", priority: "high" },
      { id: "workflow:failure:workflow-failure", type: "workflow_failure", priority: "medium" },
      { id: "script:missing:product-missing", type: "missing_script", priority: "medium" },
    ]);
    expect(result.items.every((item) => item.reason && item.target.label && item.next_action.href)).toBe(true);
    expect(result.items.find((item) => item.type === "overdue_callback")?.owner).toEqual({
      id: "operator-2",
      name: "Eva Operator",
    });
  });

  it("links outcome recovery only through its queue item session and completed call", () => {
    const result = buildTeamLeaderExceptionQueue(sources, now);
    const item = result.items.find((candidate) => candidate.type === "outcome_recovery");

    expect(item?.callReview).toEqual({
      kind: "linked",
      callId: "call-a",
      href: "/calls/call-a/review",
    });
  });

  it("does not pick a latest lead call when the exact session link is absent", () => {
    const result = buildTeamLeaderExceptionQueue({
      ...sources,
      callSessions: { status: "fulfilled", value: [] },
    }, now);
    const item = result.items.find((candidate) => candidate.type === "outcome_recovery");

    expect(item?.callReview).toEqual({ kind: "not_recorded" });
  });

  it("distinguishes an unavailable link lookup from a proven missing link", () => {
    const result = buildTeamLeaderExceptionQueue({
      ...sources,
      callSessions: { status: "rejected", reason: new Error("session lookup failed") },
    }, now);
    const item = result.items.find((candidate) => candidate.type === "outcome_recovery");

    expect(item?.callReview).toBeNull();
    expect(result.sources.callReviews).toEqual({
      state: "unavailable",
      message: "Exact call review links could not be loaded.",
    });
  });

  it("hides resolved and currently snoozed items, then resurfaces an expired snooze", () => {
    const result = buildTeamLeaderExceptionQueue({
      ...sources,
      actions: {
        status: "fulfilled",
        value: [
          {
            exception_key: "queue:outcome_recovery:queue-recovery",
            status: "resolved",
            resolution: "Operator completed the outcome.",
            snoozed_until: null,
            updated_at: "2026-09-06T09:50:00.000Z",
          },
          {
            exception_key: "queue:overdue_callback:queue-callback",
            status: "snoozed",
            resolution: "Customer asked for later.",
            snoozed_until: "2026-09-06T11:00:00.000Z",
            updated_at: "2026-09-06T09:55:00.000Z",
          },
          {
            exception_key: "queue:expired_lease:queue-lease",
            status: "snoozed",
            resolution: "Checking the operator session.",
            snoozed_until: "2026-09-06T09:59:00.000Z",
            updated_at: "2026-09-06T09:55:00.000Z",
          },
        ],
      },
    }, now);

    expect(result.items.map((item) => item.id)).not.toContain("queue:outcome_recovery:queue-recovery");
    expect(result.items.map((item) => item.id)).not.toContain("queue:overdue_callback:queue-callback");
    expect(result.items.map((item) => item.id)).toContain("queue:expired_lease:queue-lease");
    expect((result as typeof result & { history?: unknown[] }).history).toEqual([
      expect.objectContaining({ id: "queue:outcome_recovery:queue-recovery", status: "resolved" }),
      expect.objectContaining({ id: "queue:overdue_callback:queue-callback", status: "snoozed" }),
    ]);
  });

  it("resurfaces the same source when the operational problem happened again after it was handled", () => {
    const result = buildTeamLeaderExceptionQueue({
      ...sources,
      actions: {
        status: "fulfilled",
        value: [{
          exception_key: "queue:outcome_recovery:queue-recovery",
          status: "resolved",
          resolution: "The first occurrence was handled.",
          snoozed_until: null,
          updated_at: "2026-09-06T09:00:00.000Z",
        }],
      },
    }, now);

    expect(result.items.map((item) => item.id)).toContain("queue:outcome_recovery:queue-recovery");
    expect(result.history).toEqual([]);
  });

  it("keeps healthy sources visible when one source is unavailable and invents no substitute rows", () => {
    const result = buildTeamLeaderExceptionQueue({
      ...sources,
      queueItems: { status: "rejected", reason: new Error("queue unavailable") },
    }, now);

    expect(result.items.some((item) => item.source.table === "lead_queue_items")).toBe(false);
    expect(result.items.some((item) => item.source.table === "workflow_executions")).toBe(true);
    expect(result.sources.queue).toEqual({
      state: "unavailable",
      message: "Lead queue checks could not be loaded.",
    });
  });

  it("authorizes the management read before querying workspace-scoped sources", async () => {
    const tableResults: Record<string, unknown[]> = {
      lead_queue_items: [],
      workflow_executions: [],
      products: [],
      product_scripts: [],
      team_leader_exception_actions: [],
      telephony_call_sessions: [],
    };
    const queueQuery = queryResult(tableResults.lead_queue_items);
    const productQuery = queryResult(tableResults.products);
    const from = vi.fn((table: string) => {
      if (table === "lead_queue_items") return queueQuery;
      if (table === "products") return productQuery;
      return queryResult(tableResults[table]);
    });
    mocks.createDataClient.mockResolvedValue({ from });

    await expect(listTeamLeaderExceptions()).resolves.toMatchObject({ items: [] });

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["team_leader", "administrator"]);
    expect(from).toHaveBeenCalledTimes(5);
    expect(queueQuery.in).toHaveBeenCalledWith("state", ["assigned", "awaiting_outcome", "waiting_callback"]);
    expect(productQuery.select).toHaveBeenCalledWith("id, title, in_stock, created_at");
    expect(productQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(from).not.toHaveBeenCalledWith("calls");
  });

  it("loads exact session links by queue item IDs and never queries calls by lead", async () => {
    const queueRows = sources.queueItems.status === "fulfilled" ? sources.queueItems.value : [];
    const queueQuery = queryResult(queueRows);
    const sessionQuery = queryResult([{ queue_item_id: "queue-recovery", completed_call_id: "call-a" }]);
    const from = vi.fn((table: string) => {
      if (table === "lead_queue_items") return queueQuery;
      if (table === "telephony_call_sessions") return sessionQuery;
      return queryResult([]);
    });
    mocks.createDataClient.mockResolvedValue({ from });

    const result = await listTeamLeaderExceptions();

    expect(sessionQuery.in).toHaveBeenCalledWith("queue_item_id", queueRows.map((row) => row.id));
    expect(from).not.toHaveBeenCalledWith("calls");
    expect(result.items.find((item) => item.type === "outcome_recovery")?.callReview).toEqual({
      kind: "linked",
      callId: "call-a",
      href: "/calls/call-a/review",
    });
  });

  it("rejects malformed resolution input before authorization or database access", async () => {
    await expect(resolveException("not-an-exception", "ok")).rejects.toEqual(
      expect.objectContaining({ code: "VALIDATION" } satisfies Partial<DataAccessError>),
    );
    await expect(snoozeException(
      "queue:expired_lease:11111111-1111-4111-8111-111111111111",
      "2026-09-06T09:00:00.000Z",
      "later",
      now,
    )).rejects.toEqual(expect.objectContaining({ code: "VALIDATION" }));

    expect(mocks.requireWorkspaceRole).not.toHaveBeenCalled();
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });
});
