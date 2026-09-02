import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "./errors";
import { createDataClient } from "./db";
import { requireWorkspaceContext, requireWorkspaceRole } from "./workspace";
import { listWorkspaceOperators, type WorkspaceMemberDTO } from "./memberships";

type WalletSettingsRow = Database["public"]["Tables"]["wallet_settings"]["Row"];
type WalletBonusRuleRow = Database["public"]["Tables"]["wallet_bonus_rules"]["Row"];
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];
type WalletCurrency = WalletSettingsRow["currency"];

export interface WalletTransactionDTO extends WalletTransactionRow {
  user_name: string;
}

export interface WalletBalanceDTO {
  user_id: string;
  transaction_count: number;
  balance: number;
  total_credits: number;
  total_debits: number;
  user_name: string;
}

export interface WalletOverviewDTO {
  settings: WalletSettingsRow | null;
  rules: WalletBonusRuleRow[];
  transactions: WalletTransactionDTO[];
  balances: WalletBalanceDTO[];
  members: WorkspaceMemberDTO[];
  currentUserId: string;
  canManage: boolean;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadWalletSettings(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<WalletSettingsRow> {
  const { data, error } = await supabase
    .from("wallet_settings")
    .select("workspace_id, currency, monthly_commission_rate, updated_by, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Wallet settings could not be loaded.");
  }
  return data as WalletSettingsRow;
}

export async function getWalletOverview(): Promise<WalletOverviewDTO> {
  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const canManage = context.role === "team_leader" || context.role === "administrator";

  const [settings, rulesResult, transactionsResult, balancesResult, members] = await Promise.all([
    canManage ? loadWalletSettings(context.workspaceId, supabase) : Promise.resolve(null),
    canManage ? supabase
      .from("wallet_bonus_rules")
      .select("id, workspace_id, currency, minimum_order_amount, bonus_amount, effective_from, created_by, created_at")
      .eq("workspace_id", context.workspaceId)
      .order("currency", { ascending: true })
      .order("effective_from", { ascending: false })
      .order("minimum_order_amount", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    (() => {
      let query = supabase
        .from("wallet_transactions")
        .select("id, workspace_id, user_id, amount, currency, transaction_type, source_type, source_event_id, source_order_id, source_period_start, reason, author_id, audit_log_id, rule_snapshot, created_at")
        .eq("workspace_id", context.workspaceId)
        .order("created_at", { ascending: false });
      if (!canManage) query = query.eq("user_id", context.userId);
      return query;
    })(),
    supabase.rpc("get_wallet_balances", { p_workspace_id: context.workspaceId } as never),
    canManage ? listWorkspaceOperators() : Promise.resolve([]),
  ]);

  if (rulesResult.error || transactionsResult.error || balancesResult.error) {
    throw new DataAccessError("DATABASE", "Wallet data could not be loaded.");
  }

  const rawTransactions = (transactionsResult.data || []) as WalletTransactionRow[];
  const userIds = Array.from(new Set([
    context.userId,
    ...rawTransactions.map((transaction) => transaction.user_id),
    ...((members || []) as WorkspaceMemberDTO[]).map((member) => member.user_id),
  ]));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (profilesError) {
    throw new DataAccessError("DATABASE", "Wallet member names could not be loaded.");
  }

  const profileNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name?.trim() || "Unknown user"]));
  const balances = ((balancesResult.data || []) as Array<Record<string, unknown>>).map((balance) => ({
    user_id: String(balance.user_id),
    transaction_count: numberValue(balance.transaction_count),
    balance: numberValue(balance.balance),
    total_credits: numberValue(balance.total_credits),
    total_debits: numberValue(balance.total_debits),
    user_name: profileNames.get(String(balance.user_id)) || "Unknown user",
  }));

  return {
    settings,
    rules: (rulesResult.data || []) as WalletBonusRuleRow[],
    transactions: rawTransactions.map((transaction) => ({
      ...transaction,
      amount: numberValue(transaction.amount),
      user_name: profileNames.get(transaction.user_id) || "Unknown user",
    })),
    balances,
    members: (members || []) as WorkspaceMemberDTO[],
    currentUserId: context.userId,
    canManage,
  };
}

function validateCurrency(currency: string): asserts currency is WalletCurrency {
  if (!(["CZK", "EUR", "PLN"] as string[]).includes(currency)) {
    throw new DataAccessError("VALIDATION", "Unsupported wallet currency.");
  }
}

export async function updateWalletSettings(input: {
  currency: string;
  monthlyCommissionRate: number;
}): Promise<WalletSettingsRow> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  validateCurrency(input.currency);
  if (!Number.isFinite(input.monthlyCommissionRate) || input.monthlyCommissionRate < 0 || input.monthlyCommissionRate > 100) {
    throw new DataAccessError("VALIDATION", "Monthly commission rate must be between 0 and 100.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("update_wallet_settings", {
    p_workspace_id: context.workspaceId,
    p_currency: input.currency,
    p_monthly_commission_rate: input.monthlyCommissionRate,
  } as never);
  if (error || !data) throw new DataAccessError("DATABASE", "Wallet settings could not be saved.");
  return (Array.isArray(data) ? data[0] : data) as WalletSettingsRow;
}

export async function addWalletBonusRule(input: {
  currency: string;
  minimumOrderAmount: number;
  bonusAmount: number;
  effectiveFrom: string;
}): Promise<WalletBonusRuleRow> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  validateCurrency(input.currency);
  if (!Number.isFinite(input.minimumOrderAmount) || input.minimumOrderAmount <= 0 || !Number.isFinite(input.bonusAmount) || input.bonusAmount <= 0) {
    throw new DataAccessError("VALIDATION", "Order threshold and bonus must be positive.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) {
    throw new DataAccessError("VALIDATION", "A valid effective date is required.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("add_wallet_bonus_rule", {
    p_workspace_id: context.workspaceId,
    p_currency: input.currency,
    p_minimum_order_amount: input.minimumOrderAmount,
    p_bonus_amount: input.bonusAmount,
    p_effective_from: input.effectiveFrom,
  } as never);
  if (error || !data) throw new DataAccessError("DATABASE", "Bonus rule could not be saved.");
  return (Array.isArray(data) ? data[0] : data) as WalletBonusRuleRow;
}

export async function addWalletManualAdjustment(input: {
  userId: string;
  amount: number;
  reason: string;
}): Promise<WalletTransactionRow> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!input.userId.trim() || !Number.isFinite(input.amount) || input.amount === 0 || Math.abs(input.amount) > 1_000_000_000) {
    throw new DataAccessError("VALIDATION", "Adjustment must be non-zero and within the allowed range.");
  }
  if (!input.reason.trim() || input.reason.trim().length > 500) {
    throw new DataAccessError("VALIDATION", "A reason between 1 and 500 characters is required.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("add_wallet_manual_adjustment", {
    p_workspace_id: context.workspaceId,
    p_user_id: input.userId,
    p_amount: input.amount,
    p_reason: input.reason.trim(),
  } as never);
  if (error || !data) throw new DataAccessError("DATABASE", "Wallet adjustment could not be saved.");
  return (Array.isArray(data) ? data[0] : data) as WalletTransactionRow;
}
