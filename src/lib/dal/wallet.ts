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

export type WalletSectionState =
  | { state: "available" }
  | { state: "unavailable"; message: string }
  | { state: "not_applicable" };

export interface WalletSectionStates {
  settings: WalletSectionState;
  rules: WalletSectionState;
  transactions: WalletSectionState;
  balances: WalletSectionState;
  members: WalletSectionState;
  profiles: WalletSectionState;
}

export interface WalletOverviewDTO {
  settings: WalletSettingsRow | null;
  rules: WalletBonusRuleRow[];
  transactions: WalletTransactionDTO[];
  balances: WalletBalanceDTO[];
  members: WorkspaceMemberDTO[];
  sections: WalletSectionStates;
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

async function loadWalletRules(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<WalletBonusRuleRow[]> {
  const { data, error } = await supabase
    .from("wallet_bonus_rules")
    .select("id, workspace_id, currency, minimum_order_amount, bonus_amount, effective_from, created_by, created_at")
    .eq("workspace_id", workspaceId)
    .order("currency", { ascending: true })
    .order("effective_from", { ascending: false })
    .order("minimum_order_amount", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Wallet bonus rules could not be loaded.");
  }

  return (data || []) as WalletBonusRuleRow[];
}

async function loadWalletTransactions(
  workspaceId: string,
  userId: string,
  canManage: boolean,
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<WalletTransactionRow[]> {
  let query = supabase
    .from("wallet_transactions")
    .select("id, workspace_id, user_id, amount, currency, transaction_type, source_type, source_event_id, source_order_id, source_period_start, reason, author_id, audit_log_id, rule_snapshot, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (!canManage) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    throw new DataAccessError("DATABASE", "Wallet transactions could not be loaded.");
  }

  return (data || []) as WalletTransactionRow[];
}

async function loadWalletBalances(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createDataClient>>,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc("get_wallet_balances", { p_workspace_id: workspaceId } as never);

  if (error) {
    throw new DataAccessError("DATABASE", "Wallet balances could not be loaded.");
  }

  return (data || []) as Array<Record<string, unknown>>;
}

function availableSection(): WalletSectionState {
  return { state: "available" };
}

function notApplicableSection(): WalletSectionState {
  return { state: "not_applicable" };
}

function resolveSettledSection<T>(
  result: PromiseSettledResult<T>,
  fallbackMessage: string,
): { data: T | null; section: WalletSectionState } {
  if (result.status === "fulfilled") {
    return { data: result.value, section: availableSection() };
  }

  const reason = result.reason;
  if (reason instanceof DataAccessError) {
    if (reason.code !== "DATABASE") {
      throw reason;
    }

    return {
      data: null,
      section: { state: "unavailable", message: reason.message },
    };
  }

  return {
    data: null,
    section: { state: "unavailable", message: fallbackMessage },
  };
}

export async function getWalletOverview(): Promise<WalletOverviewDTO> {
  const context = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const canManage = context.role === "team_leader" || context.role === "administrator";

  const [settingsResult, rulesResult, transactionsResult, balancesResult, membersResult] = await Promise.allSettled([
    canManage ? loadWalletSettings(context.workspaceId, supabase) : Promise.resolve(null),
    canManage ? loadWalletRules(context.workspaceId, supabase) : Promise.resolve([]),
    loadWalletTransactions(context.workspaceId, context.userId, canManage, supabase),
    loadWalletBalances(context.workspaceId, supabase),
    canManage ? listWorkspaceOperators() : Promise.resolve([]),
  ]);

  const settings = canManage
    ? resolveSettledSection(settingsResult, "Wallet settings could not be loaded.")
    : { data: null, section: notApplicableSection() };
  const rules = canManage
    ? resolveSettledSection(rulesResult, "Wallet bonus rules could not be loaded.")
    : { data: [], section: notApplicableSection() };
  const transactions = resolveSettledSection(transactionsResult, "Wallet transactions could not be loaded.");
  const balances = resolveSettledSection(balancesResult, "Wallet balances could not be loaded.");
  const members = canManage
    ? resolveSettledSection(membersResult, "Workspace operators could not be loaded.")
    : { data: [], section: notApplicableSection() };

  const rawTransactions = transactions.data || [];
  const userIds = Array.from(new Set([
    context.userId,
    ...rawTransactions.map((transaction) => transaction.user_id),
    ...(members.data || []).map((member) => member.user_id),
  ]));

  let profilesSection: WalletSectionState = availableSection();
  let profileNames = new Map<string, string>();

  if (userIds.length > 0) {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) {
        profilesSection = { state: "unavailable", message: "Wallet member names could not be loaded." };
      } else {
        profileNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name?.trim() || "Unknown user"]));
      }
    } catch {
      profilesSection = { state: "unavailable", message: "Wallet member names could not be loaded." };
    }
  }

  const normalizedBalances = (balances.data || []).map((balance) => ({
    user_id: String(balance.user_id),
    transaction_count: numberValue(balance.transaction_count),
    balance: numberValue(balance.balance),
    total_credits: numberValue(balance.total_credits),
    total_debits: numberValue(balance.total_debits),
    user_name: profileNames.get(String(balance.user_id)) || "Unknown user",
  }));

  return {
    settings: settings.data,
    rules: rules.data || [],
    transactions: rawTransactions.map((transaction) => ({
      ...transaction,
      amount: numberValue(transaction.amount),
      user_name: profileNames.get(transaction.user_id) || "Unknown user",
    })),
    balances: normalizedBalances,
    members: members.data || [],
    sections: {
      settings: settings.section,
      rules: rules.section,
      transactions: transactions.section,
      balances: balances.section,
      members: members.section,
      profiles: profilesSection,
    },
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

export interface OperatorSettlementDTO {
  userId: string;
  userName: string;
  userEmail: string;
  deliveredCount: number;
  deliveredTotal: number;
  returnedCount: number;
  returnedTotal: number;
  netTurnover: number;
  fixedBonuses: number;
  commissionRate: number;
  commissionAmount: number;
  manualAdjustments: number;
  totalPayout: number;
  isFinalized: boolean;
  transactionId: string | null;
}

export interface MonthlySettlementSummaryDTO {
  periodStart: string;
  periodEnd: string;
  currency: string;
  commissionRate: number;
  totalDeliveredTotal: number;
  totalReturnedTotal: number;
  totalNetTurnover: number;
  totalFixedBonuses: number;
  totalCommission: number;
  totalManualAdjustments: number;
  totalPayout: number;
  operators: OperatorSettlementDTO[];
  canFinalize: boolean;
}

export async function finalizeWalletMonthlyCommission(input: {
  userId: string;
  periodStart: string;
}): Promise<WalletTransactionRow | null> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!input.userId?.trim()) {
    throw new DataAccessError("VALIDATION", "User ID is required.");
  }
  if (!/^\d{4}-\d{2}-01$/.test(input.periodStart)) {
    throw new DataAccessError("VALIDATION", "Period start must be the first day of the month (YYYY-MM-01).");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("finalize_wallet_monthly_commission", {
    p_workspace_id: context.workspaceId,
    p_user_id: input.userId,
    p_period_start: input.periodStart,
  } as never);

  if (error) {
    throw new DataAccessError("DATABASE", error.message || "Monthly commission could not be finalized.");
  }
  return data as WalletTransactionRow | null;
}

export async function finalizeWorkspaceMonthlySettlement(input: {
  periodStart: string;
}): Promise<{
  period_start: string;
  finalized_count: number;
  total_commission: number;
  settlements: Array<{
    user_id: string;
    user_name: string;
    amount: number;
    currency: string;
    transaction_id: string;
  }>;
}> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  if (!/^\d{4}-\d{2}-01$/.test(input.periodStart)) {
    throw new DataAccessError("VALIDATION", "Period start must be the first day of the month (YYYY-MM-01).");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("finalize_workspace_monthly_settlement", {
    p_workspace_id: context.workspaceId,
    p_period_start: input.periodStart,
  } as never);

  if (error || !data) {
    throw new DataAccessError("DATABASE", error?.message || "Monthly workspace settlement could not be completed.");
  }
  return data as {
    period_start: string;
    finalized_count: number;
    total_commission: number;
    settlements: Array<{
      user_id: string;
      user_name: string;
      amount: number;
      currency: string;
      transaction_id: string;
    }>;
  };
}

export async function getMonthlySettlementSummary(input?: {
  periodStart?: string;
}): Promise<MonthlySettlementSummaryDTO> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();

  // Default to 1st of previous month
  const now = new Date();
  const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodStart = input?.periodStart || prevMonthDate.toISOString().slice(0, 10);
  
  const [yearStr, monthStr] = periodStart.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const periodEndDate = new Date(Date.UTC(year, month, 1));
  const periodEnd = periodEndDate.toISOString().slice(0, 10);

  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const canFinalize = periodStart < currentMonthStart;

  const pStartIso = new Date(`${periodStart}T00:00:00.000Z`).toISOString();
  const pEndIso = new Date(`${periodEnd}T00:00:00.000Z`).toISOString();

  const [settings, operators, ordersRes, transactionsRes, periodBonusTxnsRes] = await Promise.all([
    loadWalletSettings(context.workspaceId, supabase).catch(() => ({
      currency: "CZK" as const,
      monthly_commission_rate: 8,
      workspace_id: context.workspaceId,
      updated_by: null,
      created_at: null,
      updated_at: null,
    })),
    listWorkspaceOperators(),
    supabase
      .from("orders")
      .select("id, agent_id, total_amount, currency, status, delivered_at, returned_at")
      .eq("workspace_id", context.workspaceId)
      .in("status", ["delivered", "returned"])
      .gte("created_at", new Date(Date.UTC(year - 1, month, 1)).toISOString()), // broad enough to catch deliveries
    supabase
      .from("wallet_transactions")
      .select("id, user_id, amount, source_period_start, source_type")
      .eq("workspace_id", context.workspaceId)
      .eq("source_type", "commission_period")
      .eq("source_period_start", periodStart),
    supabase
      .from("wallet_transactions")
      .select("id, user_id, amount, transaction_type, created_at")
      .eq("workspace_id", context.workspaceId)
      .in("transaction_type", ["order_bonus", "reversal", "manual_adjustment"])
      .gte("created_at", pStartIso)
      .lt("created_at", pEndIso),
  ]);

  const existingTransactionsByUser = new Map<string, { id: string; amount: number }>();
  for (const txn of transactionsRes.data || []) {
    existingTransactionsByUser.set(txn.user_id, { id: txn.id, amount: Number(txn.amount) });
  }

  const operatorSummaries: OperatorSettlementDTO[] = operators.map((operator) => {
    let deliveredCount = 0;
    let deliveredTotal = 0;
    let returnedCount = 0;
    let returnedTotal = 0;

    for (const order of ordersRes.data || []) {
      if (order.agent_id !== operator.user_id) continue;
      if (order.status === "delivered" && order.delivered_at && order.delivered_at >= pStartIso && order.delivered_at < pEndIso) {
        deliveredCount++;
        deliveredTotal += Number(order.total_amount) || 0;
      } else if (order.status === "returned") {
        const returnedInPeriod = order.returned_at && order.returned_at >= pStartIso && order.returned_at < pEndIso;
        const deliveredInPeriod = order.delivered_at && order.delivered_at >= pStartIso && order.delivered_at < pEndIso;
        if (returnedInPeriod || deliveredInPeriod) {
          returnedCount++;
          returnedTotal += Number(order.total_amount) || 0;
        }
      }
    }

    let fixedBonuses = 0;
    let manualAdjustments = 0;

    for (const txn of periodBonusTxnsRes.data || []) {
      if (txn.user_id !== operator.user_id) continue;
      const amt = Number(txn.amount) || 0;
      if (txn.transaction_type === "order_bonus" || txn.transaction_type === "reversal") {
        fixedBonuses += amt;
      } else if (txn.transaction_type === "manual_adjustment") {
        manualAdjustments += amt;
      }
    }

    const netTurnover = Math.max(0, deliveredTotal - returnedTotal);
    const commissionRate = settings.monthly_commission_rate;
    const computedCommission = Math.round((netTurnover * commissionRate) / 100 * 100) / 100;

    const existingTxn = existingTransactionsByUser.get(operator.user_id);
    const isFinalized = Boolean(existingTxn);
    const commissionAmount = existingTxn ? existingTxn.amount : computedCommission;
    const totalPayout = Math.max(0, Math.round((fixedBonuses + commissionAmount + manualAdjustments) * 100) / 100);

    return {
      userId: operator.user_id,
      userName: operator.full_name,
      userEmail: operator.email,
      deliveredCount,
      deliveredTotal,
      returnedCount,
      returnedTotal,
      netTurnover,
      fixedBonuses: Math.round(fixedBonuses * 100) / 100,
      commissionRate,
      commissionAmount,
      manualAdjustments: Math.round(manualAdjustments * 100) / 100,
      totalPayout,
      isFinalized,
      transactionId: existingTxn?.id || null,
    };
  });

  const totalDeliveredTotal = operatorSummaries.reduce((sum, o) => sum + o.deliveredTotal, 0);
  const totalReturnedTotal = operatorSummaries.reduce((sum, o) => sum + o.returnedTotal, 0);
  const totalNetTurnover = operatorSummaries.reduce((sum, o) => sum + o.netTurnover, 0);
  const totalFixedBonuses = operatorSummaries.reduce((sum, o) => sum + o.fixedBonuses, 0);
  const totalCommission = operatorSummaries.reduce((sum, o) => sum + o.commissionAmount, 0);
  const totalManualAdjustments = operatorSummaries.reduce((sum, o) => sum + o.manualAdjustments, 0);
  const totalPayout = operatorSummaries.reduce((sum, o) => sum + o.totalPayout, 0);

  return {
    periodStart,
    periodEnd,
    currency: settings.currency,
    commissionRate: settings.monthly_commission_rate,
    totalDeliveredTotal,
    totalReturnedTotal,
    totalNetTurnover,
    totalFixedBonuses,
    totalCommission,
    totalManualAdjustments,
    totalPayout,
    operators: operatorSummaries,
    canFinalize,
  };
}
