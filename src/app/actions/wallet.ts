"use server";

import { revalidatePath } from "next/cache";
import {
  addWalletBonusRule,
  addWalletManualAdjustment,
  finalizeWalletMonthlyCommission,
  finalizeWorkspaceMonthlySettlement,
  getMonthlySettlementSummary,
  getWalletOverview,
  updateWalletSettings,
} from "@/lib/dal/wallet";

export async function getMonthlySettlementSummaryAction(periodStart?: string) {
  return getMonthlySettlementSummary({ periodStart });
}

export async function finalizeWalletMonthlyCommissionAction(input: {
  userId: string;
  periodStart: string;
}) {
  const result = await finalizeWalletMonthlyCommission(input);
  revalidatePath("/wallet");
  return result;
}

export async function finalizeWorkspaceMonthlySettlementAction(input: {
  periodStart: string;
}) {
  const result = await finalizeWorkspaceMonthlySettlement(input);
  revalidatePath("/wallet");
  return result;
}

export async function getWalletOverviewAction() {
  return getWalletOverview();
}

export async function updateWalletSettingsAction(input: {
  currency: "CZK" | "EUR" | "PLN";
  monthlyCommissionRate: number;
}) {
  const result = await updateWalletSettings(input);
  revalidatePath("/wallet");
  revalidatePath("/settings");
  return result;
}

export async function addWalletBonusRuleAction(input: {
  currency: "CZK" | "EUR" | "PLN";
  minimumOrderAmount: number;
  bonusAmount: number;
  effectiveFrom: string;
}) {
  const result = await addWalletBonusRule(input);
  revalidatePath("/wallet");
  revalidatePath("/settings");
  return result;
}

export async function addWalletManualAdjustmentAction(input: {
  userId: string;
  amount: number;
  reason: string;
}) {
  const result = await addWalletManualAdjustment(input);
  revalidatePath("/wallet");
  return result;
}

export async function getCurrentOperatorCommissionAction(): Promise<{
  balance: number | null;
  currency: string | null;
}> {
  const overview = await getWalletOverview();
  if (overview.sections.balances.state !== "available") {
    return { balance: null, currency: null };
  }

  const currencies = new Set(overview.transactions.map((transaction) => transaction.currency.toUpperCase()));
  if (currencies.size > 1) {
    return { balance: null, currency: null };
  }

  const currency = overview.settings?.currency || overview.transactions[0]?.currency || null;
  if (!currency) return { balance: null, currency: null };

  const balance = overview.balances.find((entry) => entry.user_id === overview.currentUserId)?.balance ?? 0;
  return { balance, currency };
}
