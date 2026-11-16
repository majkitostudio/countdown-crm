"use server";

import { getAnalyticsData } from "@/lib/analytics";
import { listOperatorCalendarEntriesForWorkspace } from "@/lib/dal/calendar";
import { isDataAccessError } from "@/lib/dal/errors";
import { listCallReviewStatuses } from "@/lib/dal/callReviews";
import { listWorkspaceCallsInContext } from "@/lib/dal/activity";
import { requireWorkspaceRole, type WorkspaceContext } from "@/lib/dal/workspace";
import { getWalletOverview } from "@/lib/dal/wallet";
import { getReorderOpportunities, type ReorderOpportunity } from "@/lib/reorder";
import { buildTeamLeaderDailyBrief, type TeamLeaderDailyBrief } from "@/lib/teamLeaderDailyBrief";

export type DashboardDailyBriefActionResult =
  | { status: "ready"; brief: TeamLeaderDailyBrief; warnings: string[] }
  | { status: "forbidden" | "unavailable"; message: string };

export type ReorderOpportunitiesActionResult =
  | { ok: true; data: ReorderOpportunity[] }
  | { ok: false; message: string };

async function loadPendingReviewCount(context: WorkspaceContext) {
  const calls = await listWorkspaceCallsInContext(context);
  const statuses = await listCallReviewStatuses(context, calls.map((call) => call.id));
  return calls.filter((call) => statuses.get(call.id) === "not_reviewed").length;
}

export async function loadDashboardDailyBriefAction(): Promise<DashboardDailyBriefActionResult> {
  try {
    const context = await requireWorkspaceRole(["team_leader", "administrator"]);
    const scope = context.role === "administrator" ? "workspace" : "team";
    const [analyticsResult, calendarResult, walletResult, reviewsResult] = await Promise.allSettled([
      getAnalyticsData(context.workspaceId),
      listOperatorCalendarEntriesForWorkspace(undefined, undefined, context.workspaceId),
      getWalletOverview(),
      loadPendingReviewCount(context),
    ]);

    if (analyticsResult.status === "rejected") {
      if (isDataAccessError(analyticsResult.reason) && analyticsResult.reason.code === "FORBIDDEN") {
        return { status: "forbidden", message: analyticsResult.reason.message };
      }
      return { status: "unavailable", message: "Denní přehled nyní není dostupný." };
    }

    const warnings: string[] = [];
    const calendar = calendarResult.status === "fulfilled" ? calendarResult.value : null;
    if (calendarResult.status === "rejected") warnings.push("Naplánované hovory a připomínky nejsou dostupné.");
    if (calendar?.sources.scheduledCalls.state === "unavailable") {
      warnings.push(`Naplánované hovory nejsou dostupné: ${calendar.sources.scheduledCalls.message}`);
    }
    if (calendar?.sources.reminders.state === "unavailable") {
      warnings.push(`Připomínky nejsou dostupné: ${calendar.sources.reminders.message}`);
    }
    if (walletResult.status === "rejected") warnings.push("Souhrn peněženky není dostupný.");
    if (reviewsResult.status === "rejected") warnings.push("Fronta hodnocení není dostupná.");

    const calendarEntries = calendar?.entries ?? [];
    const scheduledCalls = calendarEntries
      .filter((entry) => entry.type === "scheduled_call" && entry.lead)
      .map((entry) => ({
        id: entry.id,
        lead_id: entry.lead!.id,
        lead_name: entry.lead!.full_name,
        scheduled_at: entry.starts_at,
      }));
    const reminders = calendarEntries
      .filter((entry) => entry.type === "reminder")
      .map((entry) => ({ starts_at: entry.starts_at, status: entry.status }));
    const walletOverview = walletResult.status === "fulfilled" ? walletResult.value : null;
    const walletState = !walletOverview ||
      walletOverview.sections.balances.state === "unavailable" ||
      walletOverview.sections.settings.state === "unavailable"
      ? "unavailable"
      : walletOverview.sections.balances.state === "not_applicable" ||
          walletOverview.sections.settings.state === "not_applicable"
        ? "not_applicable"
        : walletOverview.balances.length === 0 || !walletOverview.settings?.currency
          ? "unrecorded"
          : "available";
    if (
      walletOverview &&
      (walletOverview.sections.balances.state === "unavailable" ||
        walletOverview.sections.settings.state === "unavailable")
    ) {
      warnings.push("Souhrn peněženky není dostupný.");
    }
    const wallet = walletState === "available" && walletOverview?.settings?.currency
      ? {
          currency: walletOverview.settings.currency,
          balances: walletOverview.balances,
        }
      : null;

    return {
      status: "ready",
      brief: buildTeamLeaderDailyBrief({
        daily: analyticsResult.value.daily,
        scope,
        scheduledCalls,
        reminders,
        pendingReviews: reviewsResult.status === "fulfilled" ? reviewsResult.value : null,
        wallet,
        walletState,
      }),
      warnings,
    };
  } catch (error) {
    if (isDataAccessError(error) && error.code === "FORBIDDEN") {
      return { status: "forbidden", message: error.message };
    }
    return { status: "unavailable", message: "Denní přehled nyní není dostupný." };
  }
}

export async function loadReorderOpportunitiesAction(): Promise<ReorderOpportunitiesActionResult> {
  try {
    return { ok: true, data: await getReorderOpportunities() };
  } catch {
    return { ok: false, message: "Příležitosti k opakované objednávce nejsou dostupné, protože se nepodařilo načíst historii vyřízených objednávek." };
  }
}
