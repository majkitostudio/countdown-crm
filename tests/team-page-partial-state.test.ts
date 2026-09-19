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

function render(data: Omit<TeamPageData, "scope">, role: "team_leader" | "administrator" = "team_leader", initialView: "queue" | "operators" = "queue"): string {
  return renderToStaticMarkup(React.createElement(TeamPageContent, {
    currentUserId: "leader-1",
    role,
    data: { ...data, scope: { periodKey: "today", teamIds: [], selectableTeams: [] } },
    initialView,
  }));
}

describe("TeamPageContent partial source states", () => {
  it("keeps available queue rows and disables reassignment when operators are unavailable", () => {
    const html = render({
      queue: { status: "ready", data: [queueItem] },
      operators: { status: "unavailable", reason: "database" },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: null,
      checkpoint: { status: "unavailable", reason: "database" },
      qualityReviews: { status: "ready", data: [] },
    });

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Workspace operators are unavailable.");
    expect(html).toMatch(/<select[^>]*disabled=""[^>]*aria-label="Reassign Ada Lovelace"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Assign<\/button>/);
  });

  it("keeps a callback queue row visible when its contact details are outside the readable scope", () => {
    const html = render({
      queue: { status: "ready", data: [{ ...queueItem, state: "waiting_callback", scheduled_at: "2026-09-08T09:00:00.000Z", lead: null }] },
      operators: { status: "ready", data: [] },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: null,
      checkpoint: { status: "unavailable", reason: "database" },
      qualityReviews: { status: "ready", data: [] },
    });

    expect(html).toContain("Kontakt není v tomto rozsahu dostupný");
    expect(html).toContain("Callback po termínu");
    expect(html).toContain("Čekající callbacky");
  });

  it("does not present an unavailable queue as a verified zero-item queue", () => {
    const html = render({
      queue: { status: "unavailable", reason: "database" },
      operators: { status: "ready", data: [] },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: null,
      checkpoint: { status: "unavailable", reason: "database" },
      qualityReviews: { status: "ready", data: [] },
    });

    expect(html).toContain("Lead queue is unavailable.");
    expect(html).not.toContain("0 queue items");
    expect(html).not.toContain("Queue is empty. No assignment data was fabricated.");
  });

  it("keeps the administrator queue and member warning in their separate views", () => {
    const data = {
      queue: { status: "ready" as const, data: [queueItem] },
      operators: { status: "ready" as const, data: [] },
      presence: { status: "ready" as const, data: [] },
      roster: { status: "ready" as const, data: { teams: [], memberships: {} } },
      members: { status: "unavailable" as const, reason: "database" as const },
      checkpoint: { status: "unavailable" as const, reason: "database" as const },
      qualityReviews: { status: "ready" as const, data: [] },
    };

    expect(render(data, "administrator", "queue")).toContain("Ada Lovelace");
    expect(render(data, "administrator", "operators")).toContain("Workspace members are unavailable.");
  });

  it("renders the established empty state only for an available empty queue", () => {
    const html = render({
      queue: { status: "ready", data: [] },
      operators: { status: "ready", data: [] },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: null,
      checkpoint: { status: "unavailable", reason: "database" },
      qualityReviews: { status: "ready", data: [] },
    });

    expect(html).toContain("Queue is empty. No assignment data was fabricated.");
  });

  it("does not include membership management for a Team Leader", () => {
    const html = render({
      queue: { status: "ready", data: [] },
      operators: { status: "ready", data: [] },
      presence: { status: "ready", data: [] },
      roster: { status: "ready", data: { teams: [], memberships: {} } },
      members: null,
      checkpoint: { status: "unavailable", reason: "database" },
      qualityReviews: { status: "ready", data: [] },
    });

    expect(html).not.toContain("Current workspace members");
    expect(html).not.toContain("Správa rolí Operator, Team Leader a Administrator.");
    expect(html).not.toContain("Administrator only");
  });
});
