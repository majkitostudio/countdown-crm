"use client";

import { formatCurrencyAmount } from "@/lib/currency";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Save, SlidersHorizontal } from "lucide-react";
import {
  addWalletBonusRuleAction,
  addWalletManualAdjustmentAction,
  updateWalletSettingsAction,
} from "@/app/actions/wallet";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import { Button } from "@/components/ui/Button";
import { FieldLabel, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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
        setMessage("Nastavení peněženky uloženo.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Nastavení peněženky se nepodařilo uložit.");
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
        setMessage("Úprava peněženky uložena a auditována.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Úpravu peněženky se nepodařilo uložit.");
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
        setMessage("Bonusové pravidlo uloženo pro budoucí doručené objednávky.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Bonusové pravidlo se nepodařilo uložit.");
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
    <Surface variant="page">
      <div className="space-y-5 p-6">
      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{mode === "adjustment" ? "Auditovaná úprava peněženky" : "Pravidla peněženky"}</h2>
          <p className="text-[11px] text-zinc-500">{mode === "adjustment" ? "Ruční změny se zaznamenávají k aktérovi a auditnímu záznamu." : "Změněná nastavení používají jen budoucí odměny; zaúčtované transakce zůstávají neměnné."}</p>
        </div>
      </div>

      <div className={`grid gap-5 ${showSettings && showRules && showAdjustment ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        {showSettings && <form onSubmit={submitSettings} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Nastavení provizí</h3>
          <FieldLabel htmlFor="wallet-currency">
            Měna peněženky
            <SelectField id="wallet-currency" value={currency} onChange={(event) => setCurrency(event.target.value as WalletCurrency)} disabled={isPending}>
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
              <option value="PLN">PLN</option>
            </SelectField>
          </FieldLabel>
          <FieldLabel htmlFor="wallet-rate">
            Měsíční sazba provize (%)
            <TextField id="wallet-rate" type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} disabled={isPending} />
          </FieldLabel>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Uložit nastavení
          </Button>
        </form>}

        {showRules && <form onSubmit={submitRule} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Přidat bonusový práh</h3>
          <p className="text-[11px] leading-relaxed text-zinc-500">Vyhrává nejvyšší práh, který je nižší nebo roven celkové částce objednávky.</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel htmlFor="wallet-threshold">Objednávka od<TextField id="wallet-threshold" type="number" min="0.01" step="0.01" value={threshold} onChange={(event) => setThreshold(event.target.value)} disabled={isPending} /></FieldLabel>
            <FieldLabel htmlFor="wallet-bonus">Bonus<TextField id="wallet-bonus" type="number" min="0.01" step="0.01" value={bonus} onChange={(event) => setBonus(event.target.value)} disabled={isPending} /></FieldLabel>
          </div>
          <FieldLabel htmlFor="wallet-effective-from">Platné od<TextField id="wallet-effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} disabled={isPending} /></FieldLabel>
          <Button type="submit" variant="secondary" disabled={isPending} className="w-full">
            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Přidat pravidlo v {currency}
          </Button>
        </form>}

        {showAdjustment && <form onSubmit={submitAdjustment} className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
          <h3 className="text-xs font-semibold text-zinc-200">Ruční úprava</h3>
          <FieldLabel htmlFor="wallet-member">Člen<SelectField id="wallet-member" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} disabled={isPending || members.length === 0}><option value="">Vyberte člena</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.full_name}</option>)}</SelectField></FieldLabel>
          <FieldLabel htmlFor="wallet-adjustment">Částka (+ / - {currency})<TextField id="wallet-adjustment" type="number" step="0.01" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} disabled={isPending} /></FieldLabel>
          <FieldLabel htmlFor="wallet-reason">Důvod<TextAreaField id="wallet-reason" maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} disabled={isPending} /></FieldLabel>
          <Button type="submit" variant="secondary" disabled={isPending || !targetUserId} className="w-full">
            {isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            Uložit auditovanou úpravu
          </Button>
        </form>}
      </div>

      {showRules && visibleRules.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <h3 className="mb-3 text-xs font-semibold text-zinc-200">Aktivní prahy {currency}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {visibleRules.map((rule) => <div key={rule.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-mono text-xs text-zinc-200">{formatCurrencyAmount(rule.minimum_order_amount, currency)}+</p><p className="mt-1 text-[11px] text-emerald-300">bonus {formatCurrencyAmount(rule.bonus_amount, currency)}</p><p className="mt-2 text-[10px] text-zinc-600">od {rule.effective_from}</p></div>)}
          </div>
        </div>
      )}

      {(message || error) && <StatusAlert tone={error ? "danger" : "success"} role={error ? "alert" : "status"}>{error || message}</StatusAlert>}
      </div>
    </Surface>
  );
}
