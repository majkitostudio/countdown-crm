"use server";

import { getAnalyticsData, getRecentActivity } from "@/lib/analytics";
import type { AnalyticsOverview, RecentActivityEntry } from "@/lib/analytics";

export async function getAnalyticsDataAction(): Promise<AnalyticsOverview> {
  return getAnalyticsData();
}

export async function getRecentActivityAction(limit = 8): Promise<RecentActivityEntry[]> {
  return getRecentActivity(limit);
}
