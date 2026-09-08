import type { RecentContextSourcesActionResult } from "@/app/actions/recentContext";
import {
  buildRecentContextFromSources,
  type RecentContextData,
  type RecentContextLoadResult,
  type RecentContextLoadState,
} from "./recentContext";

export interface RecentContextLoaders {
  loadSources: () => Promise<RecentContextSourcesActionResult>;
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
  return hadPreviousContext && state === "unavailable";
}

export interface LoadedRecentContext {
  leadId: string;
  data: RecentContextData;
}

export function applyRecentContextRefresh(
  previous: LoadedRecentContext | null,
  requestedLeadId: string,
  result: RecentContextLoadResult,
): { context: LoadedRecentContext | null; isStale: boolean } {
  if (result.context) {
    return {
      context: { leadId: requestedLeadId, data: result.context },
      isStale: false,
    };
  }

  if (previous && canRetainRecentContext(previous.leadId, requestedLeadId) && result.state === "unavailable") {
    return { context: previous, isStale: true };
  }

  return { context: null, isStale: false };
}

export async function loadRecentContext(
  leadId: string,
  loaders: RecentContextLoaders,
  now?: number,
): Promise<RecentContextLoadResult> {
  const sources = await loaders.loadSources();

  return buildRecentContextFromSources({ ...sources, leadId, now });
}
