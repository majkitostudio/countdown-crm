interface TeamAssignmentMembership {
  user_id: string;
  membership_role: "member" | "leader";
  active_from: string;
  active_until: string | null;
}

interface TeamAssignmentOperator {
  user_id: string;
  role: "operator" | "team_leader" | "administrator";
}

export function buildTeamQueueAssignmentOperatorIdsByTeam(
  membershipsByTeam: Record<string, TeamAssignmentMembership[]>,
  operators: TeamAssignmentOperator[],
  now: number,
): Record<string, string[]> {
  const operatorIds = new Set(operators.filter((operator) => operator.role === "operator").map((operator) => operator.user_id));

  return Object.fromEntries(
    Object.entries(membershipsByTeam).map(([teamId, memberships]) => [
      teamId,
      memberships
        .filter((membership) => (
          membership.membership_role === "member"
          && Date.parse(membership.active_from) <= now
          && (!membership.active_until || Date.parse(membership.active_until) > now)
          && operatorIds.has(membership.user_id)
        ))
        .map((membership) => membership.user_id),
    ]),
  );
}
