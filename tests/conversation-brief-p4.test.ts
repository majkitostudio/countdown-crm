import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildConversationBrief } from "@/lib/dal/conversationBrief";
import type { LeadQueueSnapshot } from "@/lib/dal/leadQueue";

describe("ConversationBrief P4 Retargeting context", () => {
  const baseAssignment: LeadQueueSnapshot = {
    queue_item_id: "queue-1",
    workspace_id: "workspace-1",
    lead_id: "lead-1",
    assignment_state: "assigned",
    assigned_operator_id: "operator-1",
    preferred_operator_id: null,
    available_at: "2026-10-07T00:00:00.000Z",
    scheduled_at: null,
    attempt_count: 2,
    claimed_at: null,
    last_heartbeat_at: null,
    lease_expires_at: null,
    call_started_at: null,
    call_ended_at: null,
    recovery_required: false,
    lead: {
      id: "lead-1",
      workspace_id: "workspace-1",
      full_name: "Pavel Novák",
      phone: "+420777123456",
      email: "pavel@example.com",
      city: "Praha",
      company: null,
      country: "CZ",
      status: "contacted",
      ai_score: 50,
      notes: null,
      created_at: "2026-10-01T00:00:00.000Z",
      updated_at: "2026-10-01T00:00:00.000Z",
    },
  };

  it("labels previous objection as P4 Retargeting with Czech reason in Why this lead", () => {
    const brief = buildConversationBrief(baseAssignment, {
      call: {
        status: "fulfilled",
        value: {
          id: "call-1",
          created_at: "2026-10-01T10:00:00.000Z",
          duration_seconds: 120,
          outcome: "objection",
          fail_reason: "price",
          operator_note: "Klientovi přišlo 1500 Kč moc",
          callback_scheduled_at: null,
        },
      },
      note: { status: "fulfilled", value: null },
      order: { status: "fulfilled", value: null },
      queueReason: {
        status: "fulfilled",
        value: "P4 Retargeting — předchozí námitka: Cena",
      },
      productScripts: { status: "fulfilled", value: [] },
    });

    expect(brief.queue_reason).toBe("P4 Retargeting — předchozí námitka: Cena");
    expect(brief.last_outcome?.fail_reason).toBe("price");
    expect(brief.last_outcome?.operator_note).toBe("Klientovi přišlo 1500 Kč moc");
  });

  it("labels delivered order as P3 Retention in Why this lead", () => {
    const brief = buildConversationBrief(baseAssignment, {
      call: { status: "fulfilled", value: null },
      note: { status: "fulfilled", value: null },
      order: {
        status: "fulfilled",
        value: {
          id: "order-1",
          total_amount: 1200,
          currency: "CZK",
          status: "delivered",
          delivery_address_snapshot: null,
          delivered_at: "2026-09-18T10:00:00.000Z",
          created_at: "2026-09-15T10:00:00.000Z",
        },
      },
      queueReason: {
        status: "fulfilled",
        value: "P3 Retence — kontrola spokojenosti po doručení & nabídka kůry",
      },
      productScripts: { status: "fulfilled", value: [] },
    });

    expect(brief.queue_reason).toBe("P3 Retence — kontrola spokojenosti po doručení & nabídka kůry");
    expect(brief.last_order?.status).toBe("delivered");
  });

  it("labels returned order as P4 Rescue Re-ship in Why this lead", () => {
    const brief = buildConversationBrief(baseAssignment, {
      call: { status: "fulfilled", value: null },
      note: { status: "fulfilled", value: null },
      order: {
        status: "fulfilled",
        value: {
          id: "order-2",
          total_amount: 990,
          currency: "CZK",
          status: "returned",
          delivery_address_snapshot: null,
          delivered_at: null,
          created_at: "2026-10-01T10:00:00.000Z",
        },
      },
      queueReason: {
        status: "fulfilled",
        value: "P4 Záchrana — vrácený balíček (Re-ship)",
      },
      productScripts: { status: "fulfilled", value: [] },
    });

    expect(brief.queue_reason).toBe("P4 Záchrana — vrácený balíček (Re-ship)");
    expect(brief.last_order?.status).toBe("returned");
  });
});
