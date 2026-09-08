import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TeamPageData } from "@/lib/dal/teamPage";
import { TeamPageContent } from "@/components/team/TeamPageContent";

vi.mock("server-only", () => ({}));

const queueItem = {
  id: "queue-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  assigned_operator_id: "operator-1",
  preferred_operator_id: null,
  state: "assigned" as const,
  priority: 1,
  available_at: "2026-09-08T09:00:00.000Z",
  scheduled_at: null,
  attempt_count: 0,
  claimed_at: null,
  last_heartbeat_at: null,
  lease_expires_at: null,
  last_outcome: null,
  released_at: null,
  completed_at: null,
  call_started_at: null,
  call_ended_at: null,
  recovery_required: false,
  created_at: "2026-09-08T09:00:00.000Z",
  updated_at: "2026-09-08T09:00:00.000Z",
  lead: { id: "lead-1", full_name: "Ada Lovelace", phone: "+420 111 222 333", email: "ada@example.test", status: "new" as const, ai_score: 90 },
  assigned_operator: { id: "operator-1", full_name: "Grace Hopper", email: "grace@example.test" },
  preferred_operator: null,
};

function render(data: TeamPageData, role: "team_leader" | "administrator" = "team_leader"): string {
  return renderToStaticMarkup(React.createElement(TeamPageContent, {
    currentUserId: "leader-1",
    role,
    data,
  }));
}

describe("TeamPageContent partial source states", () => {
  it("keeps available queue rows and disables reassignment when operators are unavailable", () => {
    const html = render({
      queue: { state: "available", data: [queueItem] },
      operators: { state: "unavailable", message: "Workspace operators are unavailable." },
      members: null,
    });

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Workspace operators are unavailable.");
    expect(html).toMatch(/<select[^>]*disabled=""[^>]*aria-label="Reassign Ada Lovelace"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Assign<\/button>/);
  });

  it("does not present an unavailable queue as a verified zero-item queue", () => {
    const html = render({
      queue: { state: "unavailable", message: "Lead queue is unavailable." },
      operators: { state: "available", data: [] },
      members: null,
    });

    expect(html).toContain("Lead queue is unavailable.");
    expect(html).not.toContain("0 queue items");
    expect(html).not.toContain("Queue is empty. No assignment data was fabricated.");
  });

  it("keeps the administrator queue visible when members are unavailable", () => {
    const html = render({
      queue: { state: "available", data: [queueItem] },
      operators: { state: "available", data: [] },
      members: { state: "unavailable", message: "Workspace members are unavailable." },
    }, "administrator");

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Workspace members are unavailable.");
  });

  it("renders the established empty state only for an available empty queue", () => {
    const html = render({
      queue: { state: "available", data: [] },
      operators: { state: "available", data: [] },
      members: null,
    });

    expect(html).toContain("Queue is empty. No assignment data was fabricated.");
  });

  it("does not include membership management for a Team Leader", () => {
    const html = render({
      queue: { state: "available", data: [] },
      operators: { state: "available", data: [] },
      members: null,
    });

    expect(html).not.toContain("Current workspace members");
    expect(html).not.toContain("Správa rolí Operator, Team Leader a Administrator.");
    expect(html).not.toContain("Administrator only");
  });
});
