"use server";

import { getLeadActivities } from "@/lib/domainActivity";
import {
  listScheduledCallsForWorkspace,
  type ScheduledCallDTO,
} from "@/lib/dal/leadQueue";
import { isDataAccessError } from "@/lib/dal/errors";
import type {
  RecentContextScheduledCall,
  RecentContextSourceState,
} from "@/components/workspace/recentContext";
import type { WorkspaceActivity } from "@/lib/domain";

export interface RecentContextSourcesActionResult {
  activities: RecentContextSourceState<WorkspaceActivity[]>;
  scheduledCalls: RecentContextSourceState<RecentContextScheduledCall[]>;
}

function sourceRange(): { from: string; to: string } {
  const now = Date.now();
  return {
    from: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function resolveSource<T>(result: PromiseSettledResult<T>): RecentContextSourceState<T> {
  if (result.status === "fulfilled") {
    return { status: "ready", data: result.value };
  }

  if (isDataAccessError(result.reason) && result.reason.code === "DATABASE") {
    return {
      status: "unavailable",
      reason: "database",
      message: result.reason.message,
    };
  }

  throw result.reason;
}

function mapScheduledCalls(
  scheduledCalls: RecentContextSourceState<ScheduledCallDTO[]>,
): RecentContextSourceState<RecentContextScheduledCall[]> {
  if (scheduledCalls.status === "unavailable") return scheduledCalls;

  return {
    status: "ready",
    data: scheduledCalls.data.map((scheduledCall) => ({
      id: scheduledCall.id,
      lead_id: scheduledCall.lead_id,
      scheduled_at: scheduledCall.scheduled_at,
    })),
  };
}

export async function loadRecentContextSourcesAction(
  _leadId: string,
): Promise<RecentContextSourcesActionResult> {
  const { from, to } = sourceRange();
  const [activitiesResult, scheduledCallsResult] = await Promise.allSettled([
    getLeadActivities(_leadId),
    listScheduledCallsForWorkspace(from, to),
  ]);

  const activities = resolveSource(activitiesResult);
  const scheduledCalls = mapScheduledCalls(resolveSource(scheduledCallsResult));

  return { activities, scheduledCalls };
}
