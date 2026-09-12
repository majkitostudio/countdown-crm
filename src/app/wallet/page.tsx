import Link from "next/link";
import { LockKeyhole, WalletCards } from "lucide-react";
import { getWalletOverview } from "@/lib/dal/wallet";
import { WalletManagerPanel } from "@/components/wallet/WalletManagerPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import type { WalletSectionState } from "@/lib/dal/wallet";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(amount);
}

function transactionLabel(type: string): string {
  if (type === "order_bonus") return "Order bonus";
  if (type === "monthly_commission") return "Monthly commission";
  if (type === "manual_adjustment") return "Manual adjustment";
  if (type === "reversal") return "Reversal";
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
        <h1 className="text-base font-semibold text-zinc-100">Wallet unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">The wallet could not be loaded from the active workspace.</p>
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
    : currentBalance?.balance ?? null
    : null;
  const totalCredits = balancesAvailable
    ? data.canManage
    ? data.balances.reduce((sum, balance) => sum + balance.total_credits, 0)
    : currentBalance?.total_credits ?? null
    : null;
  const totalDebits = balancesAvailable
    ? data.canManage
    ? data.balances.reduce((sum, balance) => sum + balance.total_debits, 0)
    : currentBalance?.total_debits ?? null
    : null;
  const presentationCurrency = data.settings?.currency || data.transactions[0]?.currency || "CZK";

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={WalletCards}
        title="Wallet"
        description={data.canManage ? "Workspace wallet ledger and team rewards." : "Your bonuses, monthly commission and audited adjustments."}
        badge={{ label: presentationCurrency, tone: "neutral" }}
        actions={<Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-500">View orders</Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={data.canManage ? "Team balance" : "Current balance"} value={visibleBalance === null ? "Unavailable" : formatAmount(visibleBalance, presentationCurrency)} detail="Derived from posted ledger transactions" />
        <MetricCard label="Credits" value={totalCredits === null ? "Unavailable" : formatAmount(totalCredits, presentationCurrency)} valueTone="success" detail="Bonuses and finalized commissions" />
        <MetricCard label="Debits" value={totalDebits === null ? "Unavailable" : formatAmount(totalDebits, presentationCurrency)} valueTone="danger" detail="Penalties, corrections and returns" />
      </div>

      <SectionWarning title="Balance summary unavailable" state={data.sections.balances} />

      {data.canManage && balancesAvailable && data.balances.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
          <div className="border-b border-zinc-800/80 p-5"><h2 className="text-sm font-semibold text-zinc-100">Team balances</h2><p className="mt-1 text-xs text-zinc-500">Workspace members with posted wallet activity.</p></div>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{data.balances.map((balance) => <div key={balance.user_id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div><p className="text-xs font-medium text-zinc-200">{balance.user_name}</p><p className="mt-1 text-[10px] text-zinc-600">{balance.transaction_count} transactions</p></div><p className={`font-mono text-sm font-semibold ${balance.balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatAmount(balance.balance, presentationCurrency)}</p></div>)}</div>
        </section>
      )}

      {data.canManage && isUnavailable(data.sections.settings) && <SectionWarning title="Manager wallet settings unavailable" state={data.sections.settings} />}
      {data.canManage && isUnavailable(data.sections.members) && <SectionWarning title="Workspace members unavailable" state={data.sections.members} />}
      {data.canManage && isUnavailable(data.sections.profiles) && <SectionWarning title="Some member names are unavailable" state={data.sections.profiles} />}

      {data.canManage && managerSettingsAvailable && managerMembersAvailable && data.settings && (
        <WalletManagerPanel mode="adjustment" settings={data.settings} rules={data.rules} members={data.members} />
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-zinc-800/80 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-zinc-100">Transaction ledger</h2><p className="mt-1 text-xs text-zinc-500">Every entry is immutable and linked to its source or audit record.</p></div><span className="text-[10px] font-mono text-zinc-600">{data.transactions.length} entries</span></div>
        {transactionsAvailable ? (data.transactions.length === 0 ? <div className="p-12 text-center"><WalletCards className="mx-auto mb-4 h-8 w-8 text-zinc-600" /><h3 className="text-sm font-semibold text-zinc-200">No wallet transactions yet</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">Delivered order bonuses, monthly commissions and audited adjustments will appear here.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs text-zinc-300"><thead className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Member</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Source</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{data.transactions.map((transaction) => <tr key={transaction.id} className="hover:bg-zinc-800/30"><td className="whitespace-nowrap px-5 py-4 text-zinc-500">{formatDate(transaction.created_at)}</td><td className="px-5 py-4 font-medium text-zinc-200">{transaction.user_name}</td><td className="px-5 py-4"><span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300">{transactionLabel(transaction.transaction_type)}</span></td><td className="max-w-[320px] px-5 py-4 text-zinc-400">{transaction.reason}</td><td className="px-5 py-4 font-mono text-[10px] text-zinc-600">{transaction.source_order_id ? `order:${transaction.source_order_id.slice(0, 8)}` : transaction.source_period_start || "manual"}</td><td className={`whitespace-nowrap px-5 py-4 text-right font-mono font-semibold ${transaction.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{transaction.amount >= 0 ? "+" : ""}{formatAmount(transaction.amount, transaction.currency)}</td></tr>)}</tbody></table></div>) : <div className="p-5"><SectionWarning title="Transaction ledger unavailable" state={data.sections.transactions} /></div>}
      </section>
    </div>
  );
}
