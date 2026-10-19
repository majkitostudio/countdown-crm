/**
 * Aggregation of the lead queue into the four workspace departments (P1–P4).
 *
 * A queue item is attributed to a department through its team: the team's slug
 * or display name carries the department marker (see `src/lib/department.ts`).
 * The module is deliberately a pure function over plain rows so it can be
 * tested without a database and reused on the server and in the client panel.
 *
 * It holds no products, lead sources, or routing intervals — only the generic
 * department skeleton, always returning all four departments even when empty.
 */

import {
  DEPARTMENTS,
  departmentKeyFromTeam,
  type DepartmentKey,
} from "@/lib/department";
import { isOverdueScheduledCall } from "@/lib/scheduleAttention";

export const DEPARTMENT_QUEUE_STATES = [
  "available",
  "assigned",
  "in_progress",
  "awaiting_outcome",
  "scheduled",
  "closed",
  "paused",
] as const;

export type DepartmentQueueItemState = (typeof DEPARTMENT_QUEUE_STATES)[number];

/** Queue states that count as work still waiting for an operator. */
export const DEPARTMENT_QUEUE_WAITING_STATES: readonly DepartmentQueueItemState[] = ["available"];
/** Queue states that count as work an operator is already handling. */
export const DEPARTMENT_QUEUE_IN_PROGRESS_STATES: readonly DepartmentQueueItemState[] = [
  "assigned",
  "in_progress",
  "awaiting_outcome",
];
/** Queue state for a scheduled call. */
export const DEPARTMENT_QUEUE_SCHEDULED_STATE: DepartmentQueueItemState = "scheduled";

export interface DepartmentQueueItemInput {
  team_id: string | null;
  state: DepartmentQueueItemState;
  scheduled_at: string | null;
}

export interface DepartmentQueueTeamInput {
  id: string;
  slug?: string | null;
  name?: string | null;
}

export interface DepartmentQueueTeam {
  id: string;
  name: string;
}

export type DepartmentQueueStateCounts = Record<DepartmentQueueItemState, number>;

export interface DepartmentQueueTotals {
  total: number;
  /** Everything except `closed`. */
  open: number;
  waiting: number;
  inProgress: number;
  scheduledCalls: number;
  overdueScheduledCalls: number;
  closed: number;
  paused: number;
}

export interface DepartmentQueueSummary extends DepartmentQueueTotals {
  key: DepartmentKey;
  slug: string;
  name: string;
  purpose: string;
  teams: DepartmentQueueTeam[];
  counts: DepartmentQueueStateCounts;
}

export interface DepartmentQueueOverview {
  /** Always the four departments, in P1–P4 order. */
  departments: DepartmentQueueSummary[];
  /** Queue items whose team matches no department (missing or unknown team). */
  unattributed: DepartmentQueueTotals & { counts: DepartmentQueueStateCounts };
  generatedAt: string;
}

function emptyCounts(): DepartmentQueueStateCounts {
  return DEPARTMENT_QUEUE_STATES.reduce((counts, state) => {
    counts[state] = 0;
    return counts;
  }, {} as DepartmentQueueStateCounts);
}

/**
 * Derives the manager-facing totals from raw per-state counts. Overdue
 * scheduled calls are counted separately because they need the `scheduled_at`
 * comparison, so they are passed in rather than inferred from the counts.
 */
function summarize(counts: DepartmentQueueStateCounts, overdueScheduledCalls: number): DepartmentQueueTotals {
  const total = DEPARTMENT_QUEUE_STATES.reduce((sum, state) => sum + counts[state], 0);
  const sumStates = (states: readonly DepartmentQueueItemState[]) =>
    states.reduce((sum, state) => sum + counts[state], 0);

  return {
    total,
    open: total - counts.closed,
    waiting: sumStates(DEPARTMENT_QUEUE_WAITING_STATES),
    inProgress: sumStates(DEPARTMENT_QUEUE_IN_PROGRESS_STATES),
    scheduledCalls: counts[DEPARTMENT_QUEUE_SCHEDULED_STATE],
    overdueScheduledCalls,
    closed: counts.closed,
    paused: counts.paused,
  };
}

function teamDisplayName(team: DepartmentQueueTeamInput): string {
  return team.name?.trim() || team.slug?.trim() || team.id;
}

/**
 * Aggregates queue items into the four departments. Every department is always
 * present, with zero counts when it has no teams or no items. Items that cannot
 * be attributed to a department land in the `unattributed` bucket so nothing is
 * silently dropped.
 */
export function buildDepartmentQueueOverview(
  items: readonly DepartmentQueueItemInput[],
  teams: readonly DepartmentQueueTeamInput[],
  now: Date = new Date(),
): DepartmentQueueOverview {
  const departmentByTeamId = new Map<string, DepartmentKey>();
  const teamsByDepartment = new Map<DepartmentKey, DepartmentQueueTeam[]>();

  for (const team of teams) {
    const key = departmentKeyFromTeam(team);
    if (!key) continue;
    departmentByTeamId.set(team.id, key);
    const list = teamsByDepartment.get(key) ?? [];
    list.push({ id: team.id, name: teamDisplayName(team) });
    teamsByDepartment.set(key, list);
  }

  const countsByDepartment = new Map<DepartmentKey, DepartmentQueueStateCounts>(
    DEPARTMENTS.map((department) => [department.key, emptyCounts()]),
  );
  const overdueByDepartment = new Map<DepartmentKey, number>(
    DEPARTMENTS.map((department) => [department.key, 0]),
  );
  const unattributedCounts = emptyCounts();
  let unattributedOverdue = 0;

  for (const item of items) {
    const key = item.team_id ? departmentByTeamId.get(item.team_id) : undefined;
    const overdue = isOverdueScheduledCall({ state: item.state, scheduled_at: item.scheduled_at }, now);

    if (key) {
      countsByDepartment.get(key)![item.state] += 1;
      if (overdue) overdueByDepartment.set(key, overdueByDepartment.get(key)! + 1);
    } else {
      unattributedCounts[item.state] += 1;
      if (overdue) unattributedOverdue += 1;
    }
  }

  const departments = DEPARTMENTS.map((department): DepartmentQueueSummary => {
    const counts = countsByDepartment.get(department.key)!;
    return {
      key: department.key,
      slug: department.slug,
      name: department.name,
      purpose: department.purpose,
      teams: teamsByDepartment.get(department.key) ?? [],
      counts,
      ...summarize(counts, overdueByDepartment.get(department.key)!),
    };
  });

  return {
    departments,
    unattributed: {
      counts: unattributedCounts,
      ...summarize(unattributedCounts, unattributedOverdue),
    },
    generatedAt: now.toISOString(),
  };
}
