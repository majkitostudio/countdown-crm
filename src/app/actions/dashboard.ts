"use server";

import { getAnalyticsData } from "@/lib/analytics";
import { listOperatorCalendarEntriesForWorkspace } from "@/lib/dal/calendar";
import { isDataAccessError } from "@/lib/dal/errors";
import { listCallReviewStatuses } from "@/lib/dal/callReviews";
import { listWorkspaceCallsInContext } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { getWalletOverview } from "@/lib/dal/wallet";
import { getReorderOpportunities, type ReorderOpportunity } from "@/lib/reorder";
import { buildTeamLeaderDailyBrief, type TeamLeaderDailyBrief } from "@/lib/teamLeaderDailyBrief";

export type DashboardDailyBriefActionResult =
  | { status: "ready"; brief: TeamLeaderDailyBrief; warnings: string[] }
  | { status: "forbidden" | "unavailable"; message: string };

export type ReorderOpportunitiesActionResult =
  | { ok: true; data: ReorderOpportunity[] }
  | { ok: false; message: string };

async function loadPendingReviewCount() {
  const context = await requireWorkspaceContext();
  const calls = await listWorkspaceCallsInContext(context);
  const statuses = await listCallReviewStatuses(context, calls.map((call) => call.id));
  return calls.filter((call) => statuses.get(call.id) === "not_reviewed").length;
}

export async function loadDashboardDailyBriefAction(): Promise<DashboardDailyBriefActionResult> {
  try {
    const [analyticsResult, calendarResult, walletResult, reviewsResult] = await Promise.allSettled([
      getAnalyticsData(),
      listOperatorCalendarEntriesForWorkspace(),
      getWalletOverview(),
      loadPendingReviewCount(),
    ]);

    if (analyticsResult.status === "rejected") {
      if (isDataAccessError(analyticsResult.reason) && analyticsResult.reason.code === "FORBIDDEN") {
        return { status: "forbidden", message: analyticsResult.reason.message };
      }
      return { status: "unavailable", message: "Daily Brief není momentálně dostupný." };
    }

    const warnings: string[] = [];
    const calendar = calendarResult.status === "fulfilled" ? calendarResult.value : null;
    if (calendarResult.status === "rejected") warnings.push("Callbacky a reminders nejsou dostupné.");
    if (calendar?.sources.callbacks.state === "unavailable") {
      warnings.push(`Callbacky nejsou dostupné: ${calendar.sources.callbacks.message}`);
    }
    if (calendar?.sources.reminders.state === "unavailable") {
      warnings.push(`Reminders nejsou dostupné: ${calendar.sources.reminders.message}`);
    }
    if (walletResult.status === "rejected") warnings.push("Wallet souhrn není dostupný.");
    if (reviewsResult.status === "rejected") warnings.push("Review fronta není dostupná.");

    const calendarEntries = calendar?.entries ?? [];
    const callbacks = calendarEntries
      .filter((entry) => entry.type === "callback" && entry.lead)
      .map((entry) => ({
        id: entry.id,
        lead_id: entry.lead!.id,
        lead_name: entry.lead!.full_name,
        scheduled_at: entry.starts_at,
      }));
    const reminders = calendarEntries
      .filter((entry) => entry.type === "reminder")
      .map((entry) => ({ starts_at: entry.starts_at, status: entry.status }));
    const wallet = walletResult.status === "fulfilled"
      ? {
          currency: walletResult.value.settings?.currency || "CZK",
          balances: walletResult.value.balances,
        }
      : null;

    return {
      status: "ready",
      brief: buildTeamLeaderDailyBrief({
        daily: analyticsResult.value.daily,
        callbacks,
        reminders,
        pendingReviews: reviewsResult.status === "fulfilled" ? reviewsResult.value : null,
        wallet,
      }),
      warnings,
    };
  } catch (error) {
    if (isDataAccessError(error) && error.code === "FORBIDDEN") {
      return { status: "forbidden", message: error.message };
    }
    return { status: "unavailable", message: "Daily Brief není momentálně dostupný." };
  }
}

export async function loadReorderOpportunitiesAction(): Promise<ReorderOpportunitiesActionResult> {
  try {
    return { ok: true, data: await getReorderOpportunities() };
  } catch {
    return { ok: false, message: "Re-order opportunities are unavailable because fulfilled order history could not be loaded." };
  }
}
