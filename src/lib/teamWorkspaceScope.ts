import type { TeamWorkspacePeriod } from "@/lib/teamWorkspaceMetrics";

export type TeamWorkspacePeriodKey = "today" | "week" | "month";

export const TEAM_WORKSPACE_PERIOD_KEYS: readonly TeamWorkspacePeriodKey[] = [
  "today",
  "week",
  "month",
];

export const TEAM_WORKSPACE_PERIOD_LABELS: Record<TeamWorkspacePeriodKey, string> = {
  today: "Dnes",
  week: "Týden",
  month: "Měsíc",
};

export function isTeamWorkspacePeriodKey(value: unknown): value is TeamWorkspacePeriodKey {
  return typeof value === "string" && (TEAM_WORKSPACE_PERIOD_KEYS as readonly string[]).includes(value);
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function periodBoundsForPeriodKey(
  periodKey: TeamWorkspacePeriodKey,
  now = new Date(),
): TeamWorkspacePeriod {
  switch (periodKey) {
    case "today": {
      const from = startOfUtcDay(now);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "week": {
      const from = startOfUtcDay(now);
      const daysSinceMonday = (from.getUTCDay() + 6) % 7;
      from.setUTCDate(from.getUTCDate() - daysSinceMonday);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 7);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    case "month": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }
}

/**
 * Untrusted scope request coming from the client. `teamIds` is a subset of the
 * teams the current user may select; an empty array means "all selectable teams".
 */
export interface TeamWorkspaceScopeInput {
  periodKey?: TeamWorkspacePeriodKey;
  teamIds?: string[];
}