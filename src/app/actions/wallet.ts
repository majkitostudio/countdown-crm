"use server";

import { revalidatePath } from "next/cache";
import {
  addWalletBonusRule,
  addWalletManualAdjustment,
  getWalletOverview,
  updateWalletSettings,
} from "@/lib/dal/wallet";

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
  balance: number;
  currency: string;
}> {
  try {
    const overview = await getWalletOverview();
    const balance = overview.balances.find((b) => b.user_id === overview.currentUserId)?.balance ?? 0;
    const currency = overview.settings?.currency ?? "CZK";
    return { balance, currency };
  } catch {
    return { balance: 0, currency: "CZK" };
  }
}
