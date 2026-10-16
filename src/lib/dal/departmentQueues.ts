import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import {
  buildDepartmentQueueOverview,
  type DepartmentQueueItemInput,
  type DepartmentQueueOverview,
  type DepartmentQueueTeamInput,
} from "@/lib/departmentQueues";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import type { WorkspaceContext } from "./workspace";

type QueueRow = DepartmentQueueItemInput;
type TeamRow = DepartmentQueueTeamInput;

export interface DepartmentQueueOverviewOptions {
  /** Strict subset of the workspace teams; empty means every team. */
  teamIds?: string[];
  /** Injectable clock for deterministic overdue scheduled call counts. */
  now?: Date;
}

/**
 * Loads the lead queue grouped by the four departments (P1–P4). Only identity
 * columns are read from `lead_queue_items` and `teams`; the department
 * attribution and counting live in the pure `buildDepartmentQueueOverview`.
 */
export async function loadDepartmentQueueOverview(
  context: WorkspaceContext,
  options: DepartmentQueueOverviewOptions = {},
): Promise<DepartmentQueueOverview> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  const teamIds = [...new Set((options.teamIds ?? []).filter((id): id is string => Boolean(id)))];
  const supabase = await createDataClient();

  let queueQuery = supabase
    .from("lead_queue_items")
    .select("team_id, state, scheduled_at")
    .eq("workspace_id", context.workspaceId);
  if (teamIds.length > 0) {
    queueQuery = queueQuery.in("team_id", teamIds);
  }

  const [{ data: queueRows, error: queueError }, { data: teamRows, error: teamError }] = await Promise.all([
    queueQuery,
    supabase
      .from("teams")
      .select("id, slug, name")
      .eq("workspace_id", context.workspaceId),
  ]);

  if (queueError) {
    throw new DataAccessError("DATABASE", "Department queue items could not be loaded");
  }
  if (teamError) {
    throw new DataAccessError("DATABASE", "Department teams could not be loaded");
  }

  const teams = ((teamRows || []) as unknown as TeamRow[])
    .filter((team) => teamIds.length === 0 || teamIds.includes(team.id));

  return buildDepartmentQueueOverview(
    (queueRows || []) as unknown as QueueRow[],
    teams,
    options.now ?? new Date(),
  );
}

export type { DepartmentQueueOverview, DepartmentQueueSummary } from "@/lib/departmentQueues";
