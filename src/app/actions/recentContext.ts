"use server";

import { getLeadActivities } from "@/lib/domainActivity";
import {
  listScheduledCallbacksForWorkspace,
  type ScheduledCallbackDTO,
} from "@/lib/dal/leadQueue";
import { isDataAccessError } from "@/lib/dal/errors";
import type {
  RecentContextCallback,
  RecentContextSourceState,
} from "@/components/workspace/recentContext";
import type { WorkspaceActivity } from "@/lib/domain";

export interface RecentContextSourcesActionResult {
  activities: RecentContextSourceState<WorkspaceActivity[]>;
  callbacks: RecentContextSourceState<RecentContextCallback[]>;
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

function mapCallbacks(
  callbacks: RecentContextSourceState<ScheduledCallbackDTO[]>,
): RecentContextSourceState<RecentContextCallback[]> {
  if (callbacks.status === "unavailable") return callbacks;

  return {
    status: "ready",
    data: callbacks.data.map((callback) => ({
      id: callback.id,
      lead_id: callback.lead_id,
      scheduled_at: callback.scheduled_at,
    })),
  };
}

export async function loadRecentContextSourcesAction(
  _leadId: string,
): Promise<RecentContextSourcesActionResult> {
  const { from, to } = sourceRange();
  const [activitiesResult, callbacksResult] = await Promise.allSettled([
    getLeadActivities(_leadId),
    listScheduledCallbacksForWorkspace(from, to),
  ]);

  const activities = resolveSource(activitiesResult);
  const callbacks = mapCallbacks(resolveSource(callbacksResult));

  return { activities, callbacks };
}
