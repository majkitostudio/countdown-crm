import "server-only";

import { isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import {
  buildTeamRiskSummary,
  type TeamRiskPickupOrderInput,
  type TeamRiskQueueItemInput,
  type TeamRiskSummary,
} from "@/lib/teamRiskSummary";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import type { WorkspaceContext } from "./workspace";

export interface TeamRiskSummaryOptions {
  /** Injectable clock for deterministic overdue and pickup risk counts. */
  now?: Date;
}

/**
 * Loads just the columns the risk summary needs and delegates counting to the
 * pure `buildTeamRiskSummary`. The rows mirror the Exception Queue filters, so
 * the dashboard cards and the Exception Queue always agree.
 */
export async function loadTeamRiskSummary(
  context: WorkspaceContext,
  options: TeamRiskSummaryOptions = {},
): Promise<TeamRiskSummary> {
  if (!isTeamLeaderOrAdministrator(context.role)) {
    throw new DataAccessError("FORBIDDEN", "Insufficient workspace permissions");
  }

  const supabase = await createDataClient();

  const [{ data: queueRows, error: queueError }, { data: orderRows, error: orderError }] = await Promise.all([
    supabase
      .from("lead_queue_items")
      .select("state, scheduled_at, lease_expires_at, recovery_required")
      .eq("workspace_id", context.workspaceId)
      .in("state", ["assigned", "awaiting_outcome", "scheduled"]),
    supabase
      .from("orders")
      .select("status, package_location, package_arrived_at, pickup_call_completed_at")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "sent")
      .not("package_location", "is", null)
      .not("package_arrived_at", "is", null)
      .is("pickup_call_completed_at", null),
  ]);

  if (queueError) {
    throw new DataAccessError("DATABASE", "Risk queue checks could not be loaded.");
  }
  if (orderError) {
    throw new DataAccessError("DATABASE", "Pickup risk checks could not be loaded.");
  }

  return buildTeamRiskSummary(
    (queueRows || []) as unknown as TeamRiskQueueItemInput[],
    (orderRows || []) as unknown as TeamRiskPickupOrderInput[],
    options.now ?? new Date(),
  );
}

export type { TeamRiskSummary } from "@/lib/teamRiskSummary";
