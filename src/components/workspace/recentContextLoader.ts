import type { WorkspaceActivity } from "@/lib/domain";
import {
  buildRecentContextFromSources,
  type RecentContextCallback,
  type RecentContextLoadResult,
  type RecentContextLoadState,
  type RecentContextSourceState,
} from "./recentContext";

export interface RecentContextLoaders {
  loadActivities: () => Promise<WorkspaceActivity[]>;
  loadCallbacks: () => Promise<RecentContextCallback[]>;
}

export function canRetainRecentContext(
  loadedLeadId: string | undefined,
  requestedLeadId: string,
): boolean {
  return loadedLeadId === requestedLeadId;
}

export function shouldMarkRecentContextStale(
  hadPreviousContext: boolean,
  state: RecentContextLoadState,
): boolean {
  return hadPreviousContext && state !== "ready";
}

function isDatabaseDataAccessError(error: unknown): error is { code: "DATABASE"; message: string } {
  return Boolean(
    error
      && typeof error === "object"
      && "code" in error
      && error.code === "DATABASE"
      && "message" in error
      && typeof error.message === "string",
  );
}

function unavailableFromRejection(error: unknown): RecentContextSourceState<never> {
  if (isDatabaseDataAccessError(error)) {
    return { status: "unavailable", reason: "database", message: error.message };
  }

  throw error;
}

export async function loadRecentContext(
  leadId: string,
  loaders: RecentContextLoaders,
  now?: number,
): Promise<RecentContextLoadResult> {
  const [activitiesResult, callbacksResult] = await Promise.allSettled([
    loaders.loadActivities(),
    loaders.loadCallbacks(),
  ]);

  const activities: RecentContextSourceState<WorkspaceActivity[]> = activitiesResult.status === "fulfilled"
    ? { status: "ready", data: activitiesResult.value }
    : unavailableFromRejection(activitiesResult.reason);
  const callbacks = callbacksResult.status === "fulfilled"
    ? { status: "ready" as const, data: callbacksResult.value }
    : unavailableFromRejection(callbacksResult.reason);

  return buildRecentContextFromSources({ leadId, activities, callbacks, now });
}
