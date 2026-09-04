"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Save, SlidersHorizontal } from "lucide-react";
import {
  addWalletBonusRuleAction,
  addWalletManualAdjustmentAction,
  updateWalletSettingsAction,
} from "@/app/actions/wallet";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";

type WalletCurrency = "CZK" | "EUR" | "PLN";

interface WalletSettings {
  currency: WalletCurrency;
  monthly_commission_rate: number;
}

interface WalletRule {
  id: string;
  currency: WalletCurrency;
  minimum_order_amount: number;
  bonus_amount: number;
  effective_from: string;
}

function formatAmount(amount: number, currency: WalletCurrency): string {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(amount);
}

export function WalletManagerPanel({
  settings,
  rules,
  members,
  mode = "all",
  rulesAvailable = true,
}: {
  settings: WalletSettings;
  rules: WalletRule[];
  members: WorkspaceMemberDTO[];
  mode?: "all" | "settings" | "adjustment";
  rulesAvailable?: boolean;
}) {
  const [currency, setCurrency] = useState<WalletCurrency>(settings.currency);
  const [rate, setRate] = useState(String(settings.monthly_commission_rate));
  const [targetUserId, setTargetUserId] = useState(members[0]?.user_id || "");
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState("");
  const [bonus, setBonus] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateWalletSettingsAction({ currency, monthlyCommissionRate: Number(rate) });
        setMessage("Wallet settings saved.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Wallet settings could not be saved.");
      }
    });
  }

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await addWalletManualAdjustmentAction({
          userId: targetUserId,
          amount: Number(adjustment),
          reason,
        });
        setAdjustment("");
        setReason("");
        setMessage("Wallet adjustment saved and audited.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Wallet adjustment could not be saved.");
      }
    });
  }

  function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await addWalletBonusRuleAction({
          currency,
          minimumOrderAmount: Number(threshold),
          bonusAmount: Number(bonus),
          effectiveFrom,
        });
        setThreshold("");
        setBonus("");
        setMessage("Bonus rule saved for future delivered orders.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Bonus rule could not be saved.");
      }
    });
  }

  const visibleRules = rules
    .filter((rule) => rule.currency === currency)
    .sort((left, right) => right.minimum_order_amount - left.minimum_order_amount);
  const showSettings = mode === "all" || mode === "settings";
  const showRules = rulesAvailable && (mode === "all" || mode === "settings");
  const showAdjustment = mode === "all" || mode === "adjustment";

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{mode === "adjustment" ? "Audited wallet adjustment" : "Wallet rules"}</h2>
          <p className="text-[11px] text-zinc-500">{mode === "adjustment" ? "Manual changes are recorded against an actor and audit record." : "Only future rewards use changed settings; posted transactions stay immutable."}</p>
        </div>
      </div>

      <div className={`grid gap-5 ${showSettings && showRules && showAdjustment ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {showSettings && <form onSubmit={submitSettings} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Commission settings</h3>
          <label className="block text-[11px] text-zinc-500">
            Wallet currency
            <select value={currency} onChange={(event) => setCurrency(event.target.value as WalletCurrency)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600">
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
              <option value="PLN">PLN</option>
            </select>
          </label>
          <label className="block text-[11px] text-zinc-500">
            Monthly commission rate (%)
            <input type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" />
          </label>
          <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-white disabled:opacity-50">
            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save settings
          </button>
        </form>}

        {showRules && <form onSubmit={submitRule} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Add bonus threshold</h3>
          <p className="text-[11px] leading-relaxed text-zinc-500">The highest threshold at or below an order total wins.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] text-zinc-500">Order from<input type="number" min="0.01" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" /></label>
            <label className="block text-[11px] text-zinc-500">Bonus<input type="number" min="0.01" step="0.01" value={bonus} onChange={(event) => setBonus(event.target.value)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" /></label>
          </div>
          <label className="block text-[11px] text-zinc-500">Effective from<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" /></label>
          <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-50">
            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add rule in {currency}
          </button>
        </form>}

        {showAdjustment && <form onSubmit={submitAdjustment} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Manual adjustment</h3>
          <label className="block text-[11px] text-zinc-500">Member<select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={isPending || members.length === 0} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"><option value="">Select member</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.full_name}</option>)}</select></label>
          <label className="block text-[11px] text-zinc-500">Amount (+ / - {currency})<input type="number" step="0.01" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} disabled={isPending} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" /></label>
          <label className="block text-[11px] text-zinc-500">Reason<textarea maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} disabled={isPending} className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600" /></label>
          <button type="submit" disabled={isPending || !targetUserId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:border-amber-500 disabled:opacity-50">
            {isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            Save audited adjustment
          </button>
        </form>}
      </div>

      {showRules && visibleRules.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <h3 className="mb-3 text-xs font-semibold text-zinc-200">Active {currency} thresholds</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {visibleRules.map((rule) => <div key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-mono text-xs text-zinc-200">{formatAmount(rule.minimum_order_amount, currency)}+</p><p className="mt-1 text-[11px] text-emerald-300">bonus {formatAmount(rule.bonus_amount, currency)}</p><p className="mt-2 text-[10px] text-zinc-600">from {rule.effective_from}</p></div>)}
          </div>
        </div>
      )}

      {(message || error) && <p role={error ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-xs ${error ? "border-rose-900/70 bg-rose-950/30 text-rose-300" : "border-emerald-900/70 bg-emerald-950/30 text-emerald-300"}`}>{error || message}</p>}
    </section>
  );
}
