"use server";

import { DataAccessError } from "@/lib/dal/errors";
import { listScheduledCallsForWorkspace } from "@/lib/dal/leadQueue";
import {
  resolveNextBestActionState,
  type NextBestActionScheduledCall,
  type NextBestActionSource,
  type NextBestActionState,
} from "@/lib/nextBestAction";
import { getReorderOpportunities, type ReorderOpportunity } from "@/lib/reorder";

function resolveDatabaseSource<T>(result: PromiseSettledResult<T>): NextBestActionSource<T> {
  if (result.status === "fulfilled") {
    return { state: "available", data: result.value };
  }

  if (result.reason instanceof DataAccessError && result.reason.code === "DATABASE") {
    return { state: "unavailable", message: result.reason.message };
  }

  throw result.reason;
}

function mapScheduledCalls(
  scheduledCalls: Awaited<ReturnType<typeof listScheduledCallsForWorkspace>>,
): NextBestActionScheduledCall[] {
  return scheduledCalls.map((scheduledCall) => ({
    id: scheduledCall.id,
    lead_id: scheduledCall.lead_id,
    lead_name: scheduledCall.lead.full_name,
    scheduled_at: scheduledCall.scheduled_at,
  }));
}

export async function loadNextBestActionAction(): Promise<NextBestActionState> {
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const [scheduledCallsResult, reordersResult] = await Promise.allSettled([
    listScheduledCallsForWorkspace(from, to),
    getReorderOpportunities(),
  ]);

  const scheduledCalls = resolveDatabaseSource(scheduledCallsResult);
  const reorders = resolveDatabaseSource<ReorderOpportunity[]>(reordersResult);

  return resolveNextBestActionState(
    scheduledCalls.state === "available"
      ? { state: "available", data: mapScheduledCalls(scheduledCalls.data) }
      : scheduledCalls,
    reorders,
    now,
  );
}
