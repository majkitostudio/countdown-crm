"use server";

import { getAnalyticsData, getRecentActivity } from "@/lib/analytics";
import type {
  AnalyticsActionResult,
  AnalyticsOverview,
  RecentActivityEntry,
} from "@/lib/analytics";
import { isDataAccessError } from "@/lib/dal/errors";
import { isUnauthorizedError } from "@/lib/training/http";

function toAnalyticsFailure(error: unknown): Exclude<AnalyticsActionResult<never>, { ok: true }> {
  if (isUnauthorizedError(error)) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      status: 401,
      message: "Authentication is required to view analytics.",
    };
  }

  if (isDataAccessError(error)) {
    if (error.code === "FORBIDDEN") {
      return {
        ok: false,
        code: "FORBIDDEN",
        status: 403,
        message: "Analytics are available to Team Leaders and Administrators only.",
      };
    }

    if (error.code === "VALIDATION") {
      return {
        ok: false,
        code: "VALIDATION",
        status: 400,
        message: "The analytics request is invalid.",
      };
    }
  }

  console.error("Analytics request failed:", error);
  return {
    ok: false,
    code: "UNAVAILABLE",
    status: 503,
    message: "Analytics are unavailable right now.",
  };
}

export async function getAnalyticsDataAction(
  requestedWorkspaceId?: string
): Promise<AnalyticsActionResult<AnalyticsOverview>> {
  try {
    return { ok: true, data: await getAnalyticsData(requestedWorkspaceId) };
  } catch (error) {
    return toAnalyticsFailure(error);
  }
}

/**
 * Export reads go through the same server-side analytics authorization as the
 * overview. The client formatter only receives data after this succeeds.
 */
export async function exportAnalyticsDataAction(
  requestedWorkspaceId?: string
): Promise<AnalyticsActionResult<AnalyticsOverview>> {
  try {
    return { ok: true, data: await getAnalyticsData(requestedWorkspaceId) };
  } catch (error) {
    return toAnalyticsFailure(error);
  }
}

export async function getRecentActivityAction(
  limit = 8,
  requestedWorkspaceId?: string
): Promise<AnalyticsActionResult<RecentActivityEntry[]>> {
  try {
    return { ok: true, data: await getRecentActivity(limit, requestedWorkspaceId) };
  } catch (error) {
    return toAnalyticsFailure(error);
  }
}
