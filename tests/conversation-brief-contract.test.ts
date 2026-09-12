import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  getCurrentLeadForWorkspace: vi.fn(),
  createDataClient: vi.fn(),
  listLeadNotesForWorkspace: vi.fn(),
  listProductScriptsForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/leadQueue", () => ({
  getCurrentLeadForWorkspace: mocks.getCurrentLeadForWorkspace,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/dal/leadNotes", () => ({
  listLeadNotesForWorkspace: mocks.listLeadNotesForWorkspace,
}));
vi.mock("@/lib/dal/productScripts", () => ({
  listProductScriptsForWorkspace: mocks.listProductScriptsForWorkspace,
}));

import {
  buildConversationBrief,
  getConversationBriefForWorkspace,
  type ConversationBriefDTO,
  type ConversationBriefSourcesInput,
} from "@/lib/dal/conversationBrief";
import { ConversationBriefCard } from "@/components/workspace/ConversationBriefCard";

const assignment = {
  queue_item_id: "queue-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  assignment_state: "assigned" as const,
  assigned_operator_id: "operator-1",
  preferred_operator_id: "operator-1",
  available_at: "2026-09-05T08:00:00.000Z",
  scheduled_at: "2026-09-06T09:30:00.000Z",
  attempt_count: 2,
  claimed_at: "2026-09-05T08:05:00.000Z",
  last_heartbeat_at: "2026-09-05T08:06:00.000Z",
  lease_expires_at: "2026-09-05T08:10:00.000Z",
  call_started_at: null,
  call_ended_at: null,
  recovery_required: false,
  lead: {
    id: "lead-1",
    workspace_id: "workspace-1",
    full_name: "Jana Nováková",
    phone: "+420111222333",
    email: "jana@example.com",
    city: "Brno",
    company: "Nováková s.r.o.",
    country: "CZ",
    status: "contacted" as const,
    ai_score: 72,
    notes: "Hledá šetrné řešení pro bolest kloubů.",
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-09-05T08:00:00.000Z",
  },
};

const sources: ConversationBriefSourcesInput = {
  call: {
    status: "fulfilled",
    value: {
      id: "call-2",
      created_at: "2026-09-04T14:00:00.000Z",
      duration_seconds: 184,
      outcome: "followup_scheduled",
      fail_reason: null,
      operator_note: "Chce zavolat po konzultaci s manželem.",
      callback_scheduled_at: "2026-09-06T09:30:00.000Z",
    },
  },
  note: {
    status: "fulfilled",
    value: {
      id: "note-2",
      body: "Preferuje dopolední telefonát.",
      author_name: "Petr Operátor",
      created_at: "2026-09-04T14:05:00.000Z",
    },
  },
  order: {
    status: "fulfilled",
    value: {
      id: "order-1",
      total_amount: 1290,
      currency: "CZK",
      status: "delivered",
      delivery_address_snapshot: null,
      delivered_at: "2026-08-20T10:00:00.000Z",
      created_at: "2026-08-20T10:00:00.000Z",
    },
  },
  queueReason: {
    status: "fulfilled",
    value: "Customer requested a morning callback",
  },
  productScripts: {
    status: "fulfilled",
    value: [{ id: "script-1" }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({
    userId: "operator-1",
    workspaceId: "workspace-1",
    role: "operator",
  });
  mocks.getCurrentLeadForWorkspace.mockResolvedValue(assignment);
});

describe("operator Conversation Brief", () => {
  it("derives routing context from the authorized assignment instead of reading restricted queue history", async () => {
    const makeBuilder = (data: unknown) => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      builder.limit.mockReturnValue(builder);
      return builder;
    };
    const from = vi.fn((table: string) => makeBuilder(table === "calls" || table === "orders" ? null : null));
    mocks.createDataClient.mockResolvedValue({ from });
    mocks.listLeadNotesForWorkspace.mockResolvedValue([]);
    mocks.listProductScriptsForWorkspace.mockResolvedValue([]);

    const brief = await getConversationBriefForWorkspace("lead-1");

    expect(brief.queue_reason).toBe("Scheduled callback");
    expect(from).not.toHaveBeenCalledWith("lead_queue_events");
  });

  it("maps only recorded customer, contact, callback, note, order and script data", () => {
    const brief = buildConversationBrief(assignment, sources);

    expect(brief).toMatchObject({
      lead: {
        id: "lead-1",
        full_name: "Jana Nováková",
        problem: "Hledá šetrné řešení pro bolest kloubů.",
      },
      queue_reason: "Customer requested a morning callback",
      last_contact: {
        id: "call-2",
        occurred_at: "2026-09-04T14:00:00.000Z",
        duration_seconds: 184,
      },
      last_outcome: {
        outcome: "followup_scheduled",
        operator_note: "Chce zavolat po konzultaci s manželem.",
      },
      last_note: {
        body: "Preferuje dopolední telefonát.",
        author_name: "Petr Operátor",
      },
      callback: {
        scheduled_at: "2026-09-06T09:30:00.000Z",
        source: "assignment",
      },
      last_order: {
        total_amount: 1290,
        currency: "CZK",
      },
      product_context: {
        approved_script_available: true,
        approved_script_count: 1,
      },
      next_safe_step: {
        kind: "review_script_then_call",
      },
    });
    expect(brief.sources).toEqual({
      call: { state: "available" },
      callback: { state: "available" },
      note: { state: "available" },
      order: { state: "available" },
      queue_reason: { state: "available" },
      product_scripts: { state: "available" },
    });
  });

  it("keeps successful empty history distinct from unavailable sources and invents nothing", () => {
    const brief = buildConversationBrief(
      { ...assignment, scheduled_at: null, lead: { ...assignment.lead, notes: null } },
      {
        call: { status: "fulfilled", value: null },
        note: { status: "rejected", reason: new DataAccessError("DATABASE", "notes failed") },
        order: { status: "fulfilled", value: null },
        queueReason: { status: "fulfilled", value: null },
        productScripts: { status: "rejected", reason: new Error("transport failed") },
      },
    );

    expect(brief.lead.problem).toBeNull();
    expect(brief.last_contact).toBeNull();
    expect(brief.last_outcome).toBeNull();
    expect(brief.last_note).toBeNull();
    expect(brief.callback).toBeNull();
    expect(brief.last_order).toBeNull();
    expect(brief.queue_reason).toBeNull();
    expect(brief.product_context).toEqual({
      approved_script_available: null,
      approved_script_count: null,
    });
    expect(brief.sources.note).toEqual({
      state: "unavailable",
      message: "Customer notes are unavailable.",
    });
    expect(brief.sources.product_scripts).toEqual({
      state: "unavailable",
      message: "Approved product guidance is unavailable.",
    });
    expect(brief.next_safe_step.kind).toBe("verify_script_before_call");
  });

  it("does not report no callback when call and callback history are unavailable", () => {
    const brief = buildConversationBrief(
      { ...assignment, scheduled_at: null },
      {
        ...sources,
        call: { status: "rejected", reason: new Error("transport failed") },
      },
    );

    expect(brief.callback).toBeNull();
    expect(brief.sources.call).toEqual({
      state: "unavailable",
      message: "Call history is unavailable.",
    });
    expect(brief.sources.callback).toEqual({
      state: "unavailable",
      message: "Callback history is unavailable.",
    });
  });

  it("rejects a lead that is not the operator's current assignment before loading its history", async () => {
    mocks.getCurrentLeadForWorkspace.mockResolvedValue({ ...assignment, lead_id: "lead-2" });

    await expect(getConversationBriefForWorkspace("lead-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Contact unavailable",
    });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
    expect(mocks.listLeadNotesForWorkspace).not.toHaveBeenCalled();
  });

  it("renders recorded facts and visibly labels an unavailable source without model claims", () => {
    const brief: ConversationBriefDTO = buildConversationBrief(assignment, {
      ...sources,
      note: { status: "rejected", reason: new Error("transport failed") },
    });
    const html = renderToStaticMarkup(
      React.createElement(ConversationBriefCard, {
        brief,
        isLoading: false,
        error: null,
      }),
    );

    expect(html).toContain("Conversation Brief");
    expect(html).toContain("Hledá šetrné řešení pro bolest kloubů.");
    expect(html).toContain("Follow-up scheduled");
    expect(html).toContain("Customer notes are unavailable.");
    expect(html).toContain("Review the approved script, then start the call.");
    expect(html).not.toMatch(/\bAI\b|predicted|recommended by model|invented urgency/i);
  });
});
