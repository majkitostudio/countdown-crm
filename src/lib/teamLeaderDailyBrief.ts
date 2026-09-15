import type { NextBestActionCallback, NextBestActionReorderOpportunity } from "./nextBestAction";
import type { DailyTeamSummary } from "./dailyTeamSummary";

export interface DailyBriefReminder {
  starts_at: string;
  status: "open" | "completed" | "scheduled";
}

export interface DailyBriefWallet {
  currency: string;
  balances: Array<{
    balance: number;
    transaction_count: number;
  }>;
}

export type DailyBriefScope = "team" | "workspace";

export interface TeamLeaderDailyBrief {
  scope: DailyBriefScope;
  scopeLabel: string;
  daily: DailyTeamSummary;
  callbacksToAttend: number;
  todayCallbacks: number;
  overdueCallbacks: number;
  openReminders: number;
  urgentReorders: number;
  pendingReviews: number | null;
  workspaceWalletBalance: number | null;
  workspaceWalletTransactions: number | null;
  walletCurrency: string | null;
}

export interface TeamLeaderDailyBriefInput {
  daily: DailyTeamSummary;
  callbacks?: NextBestActionCallback[];
  reminders?: DailyBriefReminder[];
  reorderOpportunities?: NextBestActionReorderOpportunity[];
  pendingReviews?: number | null;
  wallet?: DailyBriefWallet | null;
  scope?: DailyBriefScope;
  now?: Date;
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isSameDay(value: string, now: Date): boolean {
  const date = new Date(value);
  return isValidDate(value) && date.toDateString() === now.toDateString();
}

/** Builds the manager's daily snapshot from already authorized workspace data. */
export function buildTeamLeaderDailyBrief(input: TeamLeaderDailyBriefInput): TeamLeaderDailyBrief {
  const now = input.now ?? new Date();
  const scope = input.scope ?? "team";
  const callbacks = (input.callbacks ?? []).filter((callback) => isValidDate(callback.scheduled_at));
  const reminders = input.reminders ?? [];
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const callbacksToAttend = callbacks.filter((callback) => Date.parse(callback.scheduled_at) <= endOfDay.getTime()).length;
  const overdueCallbacks = callbacks.filter((callback) => Date.parse(callback.scheduled_at) < now.getTime()).length;
  const wallet = input.wallet ?? null;

  return {
    scope,
    scopeLabel: scope === "team" ? "Týmová data" : "Celý workspace",
    daily: input.daily,
    callbacksToAttend,
    todayCallbacks: callbacks.filter((callback) => isSameDay(callback.scheduled_at, now)).length,
    overdueCallbacks,
    openReminders: reminders.filter((reminder) => reminder.status === "open" && isSameDay(reminder.starts_at, now)).length,
    urgentReorders: (input.reorderOpportunities ?? []).filter(
      (opportunity) => opportunity.urgency === "urgent" || opportunity.urgency === "due_soon",
    ).length,
    pendingReviews: input.pendingReviews ?? null,
    workspaceWalletBalance: wallet ? wallet.balances.reduce((sum, balance) => sum + Number(balance.balance || 0), 0) : null,
    workspaceWalletTransactions: wallet
      ? wallet.balances.reduce((sum, balance) => sum + Number(balance.transaction_count || 0), 0)
      : null,
    walletCurrency: wallet?.currency ?? null,
  };
}
