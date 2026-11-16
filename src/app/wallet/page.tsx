import Link from "next/link";
import { LockKeyhole, WalletCards } from "lucide-react";
import { getMonthlySettlementSummary, getWalletOverview } from "@/lib/dal/wallet";
import { WalletManagerPanel } from "@/components/wallet/WalletManagerPanel";
import { WalletSettlementPanel } from "@/components/wallet/WalletSettlementPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";
import type { WalletSectionState } from "@/lib/dal/wallet";
import { formatCurrencyAmount } from "@/lib/currency";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatMetricAmount(amount: number | null, currency: string | null, emptyLabel = "—") {
  return amount === null
    ? emptyLabel
    : <span className="font-mono tabular-nums">{formatCurrencyAmount(amount, currency)}</span>;
}

function transactionLabel(type: string): string {
  if (type === "order_bonus") return "Bonus z objednávky";
  if (type === "monthly_commission") return "Měsíční provize";
  if (type === "manual_adjustment") return "Ruční úprava";
  if (type === "reversal") return "Storno";
  return type;
}

async function loadWallet() {
  try {
    return { data: await getWalletOverview() };
  } catch (error) {
    return { error };
  }
}

function isUnavailable(state: WalletSectionState): state is Extract<WalletSectionState, { state: "unavailable" }> {
  return state.state === "unavailable";
}

function SectionWarning({ title, state }: { title: string; state: WalletSectionState }) {
  if (state.state !== "unavailable") {
    return null;
  }

  return (
    <StatusAlert tone="warning">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-amber-200/80">{state.message}</p>
    </StatusAlert>
  );
}

export default async function WalletPage() {
  const result = await loadWallet();

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-xl">
      <Surface variant="empty">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Peněženka není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-400">Peněženku se nepodařilo načíst z aktivního pracovního prostoru.</p>
      </Surface>
      </div>
    );
  }

  const { data } = result;
  const balancesAvailable = data.sections.balances.state === "available";
  const transactionsAvailable = data.sections.transactions.state === "available";
  const managerSettingsAvailable = data.sections.settings.state === "available";
  const managerMembersAvailable = data.sections.members.state === "available";
  const currentBalance = balancesAvailable
    ? data.balances.find((balance) => balance.user_id === data.currentUserId)
    : null;
  const visibleBalance = balancesAvailable
    ? data.canManage
    ? data.balances.reduce((sum, balance) => sum + balance.balance, 0)
    : currentBalance?.balance ?? 0
    : null;
  const totalCredits = balancesAvailable
    ? data.canManage
    ? data.balances.reduce((sum, balance) => sum + balance.total_credits, 0)
    : currentBalance?.total_credits ?? 0
    : null;
  const totalDebits = balancesAvailable
    ? data.canManage
    ? data.balances.reduce((sum, balance) => sum + balance.total_debits, 0)
    : currentBalance?.total_debits ?? 0
    : null;
  const creditsTone = totalCredits === null ? "neutral" : "success";
  const debitsTone = totalDebits === null ? "neutral" : "danger";
  const presentationCurrency = data.settings?.currency ?? null;
  const metricEmptyLabel = "—";

  let settlementSummary = null;
  const availableMonths: Array<{ label: string; value: string; isPast: boolean }> = [];

  if (data.canManage) {
    try {
      settlementSummary = await getMonthlySettlementSummary();
    } catch {
      settlementSummary = null;
    }

    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const value = d.toISOString().slice(0, 10);
      const monthName = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(d);
      const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const isPast = d.getTime() < currentMonthStart.getTime();
      availableMonths.push({ label, value, isPast });
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={WalletCards}
        title="Peněženka"
        description={data.canManage ? "Účetní deník peněženky pracovního prostoru a odměny týmu." : "Vaše bonusy, měsíční provize a auditované úpravy."}
        badge={{ label: presentationCurrency || "CZK", tone: "neutral" }}
        actions={<Link href="/orders" className={getButtonClassName("secondary")}>Zobrazit objednávky</Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={data.canManage ? "Týmový zůstatek" : "Aktuální zůstatek"} value={formatMetricAmount(visibleBalance, presentationCurrency, metricEmptyLabel)} detail="Odvozeno ze zaúčtovaných transakcí deníku" />
        <MetricCard label="Kredity" value={formatMetricAmount(totalCredits, presentationCurrency, metricEmptyLabel)} valueTone={creditsTone} detail="Bonusy a finalizované provize" />
        <MetricCard label="Debety" value={formatMetricAmount(totalDebits, presentationCurrency, metricEmptyLabel)} valueTone={debitsTone} detail="Pokuty, opravy a vrácení" />
      </div>

      <SectionWarning title="Souhrn zůstatku není dostupný" state={data.sections.balances} />

      {data.canManage && balancesAvailable && data.balances.length > 0 && (
        <Surface variant="page">
          <div className="border-b border-zinc-800/80 p-5"><h2 className="text-sm font-semibold text-zinc-100">Zůstatky týmu</h2><p className="mt-1 text-xs text-zinc-400">Členové pracovního prostoru s aktivitou v peněžence.</p></div>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{data.balances.map((balance) => <Surface key={balance.user_id} variant="inset" className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-zinc-200">{balance.user_name}</p><p className="mt-1 text-[10px] text-zinc-400">{balance.transaction_count} transakcí</p></div><p className={`font-mono text-sm font-semibold ${balance.balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatCurrencyAmount(balance.balance, presentationCurrency)}</p></div></Surface>)}</div>
        </Surface>
      )}

      {data.canManage && isUnavailable(data.sections.settings) && <SectionWarning title="Nastavení peněženky manažera není dostupné" state={data.sections.settings} />}
      {data.canManage && isUnavailable(data.sections.members) && <SectionWarning title="Členové pracovního prostoru nejsou dostupní" state={data.sections.members} />}
      {data.canManage && isUnavailable(data.sections.profiles) && <SectionWarning title="Některá jména členů nejsou dostupná" state={data.sections.profiles} />}

      {data.canManage && managerSettingsAvailable && managerMembersAvailable && data.settings && (
        <>
          {settlementSummary && (
            <WalletSettlementPanel
              initialSummary={settlementSummary}
              availableMonths={availableMonths}
            />
          )}
          <WalletManagerPanel mode="adjustment" settings={data.settings} rules={data.rules} members={data.members} />
        </>
      )}

      <Surface variant="page">
        <div className="flex flex-col gap-2 border-b border-zinc-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Deník transakcí</h2>
            <p className="mt-1 text-xs text-zinc-400">Každý záznam je neměnný a propojený se zdrojem nebo auditním záznamem.</p>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">{data.transactions.length} záznamů</span>
        </div>
        {transactionsAvailable ? (
          data.transactions.length === 0 ? (
            <div className="p-12 text-center">
              <WalletCards className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-200">Zatím žádné transakce v peněžence</h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
                Bonusy z doručených objednávek, měsíční provize a auditované úpravy se zde zobrazí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Datum</th>
                    <th className="px-5 py-3">Člen</th>
                    <th className="px-5 py-3">Typ</th>
                    <th className="px-5 py-3">Důvod</th>
                    <th className="px-5 py-3">Zdroj</th>
                    <th className="px-5 py-3 text-right">Částka (CZK, není-li uvedeno jinak)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-zinc-800/30">
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-400">{formatDate(transaction.created_at)}</td>
                      <td className="px-5 py-4 font-medium text-zinc-200">{transaction.user_name}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">
                          {transactionLabel(transaction.transaction_type)}
                        </span>
                      </td>
                      <td className="max-w-[320px] px-5 py-4 text-zinc-400">{transaction.reason}</td>
                      <td className="px-5 py-4 font-mono text-[10px] text-zinc-400">
                        {transaction.source_order_id
                          ? `order:${transaction.source_order_id.slice(0, 8)}`
                          : transaction.source_period_start || "ruční"}
                      </td>
                      <td className={`whitespace-nowrap px-5 py-4 text-right font-mono font-semibold ${transaction.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {transaction.amount >= 0 ? "+" : ""}{formatCurrencyAmount(transaction.amount, transaction.currency, { omitCzk: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="p-5">
            <SectionWarning title="Deník transakcí není dostupný" state={data.sections.transactions} />
          </div>
        )}
      </Surface>
    </div>
  );
}
