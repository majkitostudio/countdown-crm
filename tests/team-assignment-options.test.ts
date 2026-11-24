import { describe, expect, it } from "vitest";
import { buildTeamQueueAssignmentOperatorIdsByTeam } from "@/lib/teamAssignmentOptions";

describe("team queue assignment options", () => {
  it("returns only active operator members for each team", () => {
    const now = Date.parse("2026-11-25T12:00:00.000Z");
    const memberships = {
      "team-1": [
        { user_id: "active-operator", membership_role: "member" as const, active_from: "2026-11-01T00:00:00.000Z", active_until: null },
        { user_id: "expired-operator", membership_role: "member" as const, active_from: "2026-11-01T00:00:00.000Z", active_until: "2026-11-24T00:00:00.000Z" },
        { user_id: "future-operator", membership_role: "member" as const, active_from: "2026-11-26T00:00:00.000Z", active_until: null },
        { user_id: "team-leader", membership_role: "leader" as const, active_from: "2026-11-01T00:00:00.000Z", active_until: null },
      ],
    };
    const operators = [
      { user_id: "active-operator", role: "operator" as const },
      { user_id: "expired-operator", role: "operator" as const },
      { user_id: "future-operator", role: "operator" as const },
      { user_id: "team-leader", role: "team_leader" as const },
      { user_id: "admin", role: "administrator" as const },
    ];

    expect(buildTeamQueueAssignmentOperatorIdsByTeam(memberships, operators, now)).toEqual({
      "team-1": ["active-operator"],
    });
  });
});
