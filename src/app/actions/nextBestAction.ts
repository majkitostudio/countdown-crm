"use server";

import { DataAccessError } from "@/lib/dal/errors";
import { listScheduledCallbacksForWorkspace } from "@/lib/dal/leadQueue";
import {
  resolveNextBestActionState,
  type NextBestActionCallback,
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

function mapCallbacks(
  callbacks: Awaited<ReturnType<typeof listScheduledCallbacksForWorkspace>>,
): NextBestActionCallback[] {
  return callbacks.map((callback) => ({
    id: callback.id,
    lead_id: callback.lead_id,
    lead_name: callback.lead.full_name,
    scheduled_at: callback.scheduled_at,
  }));
}

export async function loadNextBestActionAction(): Promise<NextBestActionState> {
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const [callbacksResult, reordersResult] = await Promise.allSettled([
    listScheduledCallbacksForWorkspace(from, to),
    getReorderOpportunities(),
  ]);

  const callbacks = resolveDatabaseSource(callbacksResult);
  const reorders = resolveDatabaseSource<ReorderOpportunity[]>(reordersResult);

  return resolveNextBestActionState(
    callbacks.state === "available"
      ? { state: "available", data: mapCallbacks(callbacks.data) }
      : callbacks,
    reorders,
    now,
  );
}
