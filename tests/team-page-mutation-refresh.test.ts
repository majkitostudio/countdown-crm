import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TeamPageData } from "@/lib/dal/teamPage";
import * as teamPageContent from "@/components/team/TeamPageContent";

vi.mock("server-only", () => ({}));

const queueItem = {
  id: "queue-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  assigned_operator_id: "operator-old",
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
  lead: {
    id: "lead-1",
    full_name: "Stale Queue Lead",
    phone: "+420 111 222 333",
    email: "lead@example.test",
    status: "new" as const,
    ai_score: 90,
  },
  assigned_operator: { id: "operator-old", full_name: "Old Operator", email: "old@example.test" },
  preferred_operator: null,
};

const oldOperator = {
  workspace_id: "workspace-1",
  user_id: "operator-old",
  role: "operator" as const,
  full_name: "Old Operator",
  email: "old@example.test",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const changedMember = {
  workspace_id: "workspace-1",
  user_id: "member-changed",
  role: "team_leader" as const,
  full_name: "Changed Member",
  email: "changed@example.test",
  avatar_url: null,
  created_at: "2026-01-02T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

type TeamMutationRunner = (
  mutation: () => Promise<unknown>,
  refresh: () => Promise<TeamPageData>,
  replace: (data: TeamPageData) => void,
) => Promise<void>;

type TeamDataSelector = (
  state: { initialData: TeamPageData; data: TeamPageData },
  incomingData: TeamPageData,
) => TeamPageData;

function getRunner(): TeamMutationRunner {
  expect(teamPageContent).toHaveProperty("runTeamMutationAndRefresh", expect.any(Function));
  return (teamPageContent as typeof teamPageContent & {
    runTeamMutationAndRefresh: TeamMutationRunner;
  }).runTeamMutationAndRefresh;
}

function getSelector(): TeamDataSelector {
  expect(teamPageContent).toHaveProperty("selectCurrentTeamPageData", expect.any(Function));
  return (teamPageContent as typeof teamPageContent & {
    selectCurrentTeamPageData: TeamDataSelector;
  }).selectCurrentTeamPageData;
}

function render(data: TeamPageData): string {
  return renderToStaticMarkup(React.createElement(teamPageContent.TeamPageContent, {
    currentUserId: "admin-1",
    role: "administrator",
    data,
  }));
}

describe("Team mutation composite refresh", () => {
  it("prefers newly received route data over an older client refresh snapshot", () => {
    const initialData: TeamPageData = {
      queue: { status: "ready", data: [queueItem] },
      operators: { status: "ready", data: [oldOperator] },
      members: null,
    };
    const locallyRefreshedData: TeamPageData = {
      queue: { status: "unavailable", reason: "database" },
      operators: { status: "ready", data: [oldOperator] },
      members: null,
    };
    const incomingData: TeamPageData = {
      queue: { status: "ready", data: [] },
      operators: { status: "ready", data: [] },
      members: null,
    };

    expect(getSelector()(
      { initialData, data: locallyRefreshedData },
      incomingData,
    )).toBe(incomingData);
  });

  it("replaces stale actionable queue rows after a successful mutation returns a structured queue failure", async () => {
    let state: TeamPageData = {
      queue: { status: "ready", data: [queueItem] },
      operators: { status: "ready", data: [oldOperator] },
      members: { status: "ready", data: [oldOperator] },
    };
    const events: string[] = [];

    await getRunner()(
      async () => { events.push("mutation"); },
      async () => {
        events.push("refresh");
        return {
          queue: { status: "unavailable", reason: "database" },
          operators: { status: "ready", data: [oldOperator] },
          members: { status: "ready", data: [oldOperator] },
        };
      },
      (next) => {
        events.push("replace");
        state = next;
      },
    );

    const html = render(state);
    expect(events).toEqual(["mutation", "refresh", "replace"]);
    expect(html).toContain("Lead queue is unavailable.");
    expect(html).not.toContain("Stale Queue Lead");
    expect(html).not.toContain("1 queue item");
  });

  it.each([
    { operation: "role change", mutationResult: { ...changedMember, role: "operator" as const } },
    { operation: "removal", mutationResult: undefined },
  ])("refreshes operator choices after a member $operation", async ({ mutationResult }) => {
    let state: TeamPageData = {
      queue: { status: "ready", data: [queueItem] },
      operators: { status: "ready", data: [oldOperator] },
      members: { status: "ready", data: [oldOperator, changedMember] },
    };
    let mutationCount = 0;

    await getRunner()(
      async () => {
        mutationCount += 1;
        return mutationResult;
      },
      async () => ({
        queue: { status: "ready", data: [queueItem] },
        operators: mutationResult
          ? { status: "ready", data: [{ ...changedMember, role: "operator" as const }] }
          : { status: "ready", data: [] },
        members: mutationResult
          ? { status: "ready", data: [{ ...changedMember, role: "operator" as const }] }
          : { status: "ready", data: [changedMember] },
      }),
      (next) => { state = next; },
    );

    const html = render(state);
    expect(mutationCount).toBe(1);
    expect(html).not.toContain('<option value="operator-old">Old Operator</option>');
    if (mutationResult) {
      expect(html).toContain('<option value="member-changed">Changed Member</option>');
    } else {
      expect(html).not.toContain('<option value="member-changed">Changed Member</option>');
    }
  });
});
