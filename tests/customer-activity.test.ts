import { describe, expect, it } from "vitest";
import {
  pageCustomerActivityEvents,
  type CustomerActivityEvent,
} from "@/lib/customerActivity";

function event(id: string, occurredAt: string): CustomerActivityEvent {
  return {
    id,
    source_entity_id: id,
    workspace_id: "workspace-1",
    lead_id: "lead-1",
    occurred_at: occurredAt,
    source: id.startsWith("call:") ? "call" : id.startsWith("order:") ? "order" : "lead_note",
    channel: id.startsWith("call:") ? "voice" : id.startsWith("order:") ? "commerce" : "internal_note",
    actor: { id: "operator-1", display_name: "Operator" },
    preview: { title: id, text: null },
    metadata: {},
  };
}

describe("Customer activity read model paging", () => {
  it("sorts all sources deterministically and applies one global limit", () => {
    const entries = [
      event("call:1", "2026-09-01T10:00:00.000Z"),
      event("order:1", "2026-09-01T10:00:00.000Z"),
      event("lead_note:1", "2026-09-01T09:00:00.000Z"),
    ];

    const page = pageCustomerActivityEvents(entries, { limit: 2 });

    expect(page.items.map((entry) => entry.id)).toEqual(["order:1", "call:1"]);
    expect(page.has_more).toBe(true);
    expect(page.next_cursor).toBeTruthy();
  });

  it("continues after an opaque cursor without repeating the previous page", () => {
    const entries = [
      event("call:1", "2026-09-01T10:00:00.000Z"),
      event("order:1", "2026-09-01T09:00:00.000Z"),
      event("lead_note:1", "2026-09-01T08:00:00.000Z"),
    ];

    const firstPage = pageCustomerActivityEvents(entries, { limit: 2 });
    const secondPage = pageCustomerActivityEvents(entries, {
      limit: 2,
      cursor: firstPage.next_cursor || undefined,
    });

    expect(secondPage.items.map((entry) => entry.id)).toEqual(["lead_note:1"]);
    expect(secondPage.items.some((entry) => firstPage.items.includes(entry))).toBe(false);
    expect(secondPage.has_more).toBe(false);
    expect(secondPage.next_cursor).toBeNull();
  });

  it("deduplicates by the canonical event id", () => {
    const duplicate = event("call:1", "2026-09-01T10:00:00.000Z");
    const page = pageCustomerActivityEvents([duplicate, duplicate], { limit: 10 });

    expect(page.items).toHaveLength(1);
  });
});
