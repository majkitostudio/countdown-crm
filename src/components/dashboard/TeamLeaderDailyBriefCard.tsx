"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Coins, PhoneCall } from "lucide-react";
import { listCalendarEntriesAction } from "@/app/actions/calendar";
import { getAnalyticsDataAction } from "@/app/actions/analytics";
import { getWalletOverviewAction } from "@/app/actions/wallet";
import { getReorderOpportunities } from "@/lib/reorder";
import { buildTeamLeaderDailyBrief, type TeamLeaderDailyBrief } from "@/lib/teamLeaderDailyBrief";
import { formatCurrencyAmounts } from "@/lib/currency";

type BriefState =
  | { status: "loading" }
  | { status: "forbidden" | "unavailable"; message: string }
  | { status: "ready"; brief: TeamLeaderDailyBrief; warnings: string[] };

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T12:00:00.000Z`));
}

export function TeamLeaderDailyBriefCard() {
  const [state, setState] = useState<BriefState>({ status: "loading" });
  const readyState = state.status === "ready" ? state : null;

  useEffect(() => {
    let cancelled = false;

    async function loadBrief() {
      try {
        const analyticsResult = await getAnalyticsDataAction();
        if (!analyticsResult.ok) {
          if (!cancelled) {
            setState({
              status: analyticsResult.code === "FORBIDDEN" ? "forbidden" : "unavailable",
              message: analyticsResult.message,
            });
          }
          return;
        }

        const [calendarResult, walletResult, reorderResult] = await Promise.allSettled([
          listCalendarEntriesAction(),
          getWalletOverviewAction(),
          getReorderOpportunities(),
        ]);
        if (cancelled) return;

        const warnings: string[] = [];
        const calendarEntries = calendarResult.status === "fulfilled" ? calendarResult.value.entries : [];
        if (calendarResult.status === "rejected") warnings.push("Callbacky a reminders nejsou dostupné.");
        if (calendarResult.status === "fulfilled") {
          if (calendarResult.value.sources.callbacks.state === "unavailable") {
            warnings.push(`Callbacky nejsou dostupné: ${calendarResult.value.sources.callbacks.message}`);
          }
          if (calendarResult.value.sources.reminders.state === "unavailable") {
            warnings.push(`Reminders nejsou dostupné: ${calendarResult.value.sources.reminders.message}`);
          }
        }
        if (walletResult.status === "rejected") warnings.push("Wallet souhrn není dostupný.");
        if (reorderResult.status === "rejected") warnings.push("Re-order odhady nejsou dostupné.");

        const callbacks = calendarEntries
          .filter((entry) => entry.type === "callback" && entry.lead)
          .map((entry) => ({
            id: entry.id,
            lead_id: entry.lead!.id,
            lead_name: entry.lead!.full_name,
            scheduled_at: entry.starts_at,
          }));
        const reminders = calendarEntries
          .filter((entry) => entry.type === "reminder")
          .map((entry) => ({ starts_at: entry.starts_at, status: entry.status }));
        const wallet = walletResult.status === "fulfilled"
          ? {
              currency: walletResult.value.settings?.currency || "CZK",
              balances: walletResult.value.balances,
            }
          : null;
        const reorderOpportunities = reorderResult.status === "fulfilled" ? reorderResult.value : [];

        setState({
          status: "ready",
          brief: buildTeamLeaderDailyBrief({
            daily: analyticsResult.data.daily,
            callbacks,
            reminders,
            reorderOpportunities,
            wallet,
          }),
          warnings,
        });
      } catch {
        if (!cancelled) setState({ status: "unavailable", message: "Daily Brief není momentálně dostupný." });
      }
    }

    void loadBrief();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6" data-testid="team-leader-daily-brief">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Team Leader Daily Brief</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Dnešní workspace souhrn a nejbližší akce.</p>
          </div>
        </div>
        <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-500">Read-only</span>
      </div>

      {state.status === "loading" ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-400">Načítám dnešní brief…</div>
      ) : state.status === "forbidden" ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">Daily Brief je dostupný pouze Team Leaderům a Administrátorům.</div>
      ) : state.status === "unavailable" ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">Daily Brief není dostupný: {state.message}</div>
      ) : readyState ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BriefMetric label="Calls today" value={String(readyState.brief.daily.calls)} icon={PhoneCall} />
            <BriefMetric label="Orders today" value={String(readyState.brief.daily.completedOrders)} icon={CheckCircle2} />
            <BriefMetric label="Revenue today" value={formatCurrencyAmounts(readyState.brief.daily.revenueByCurrency)} icon={Coins} />
            <BriefMetric label="Callback attention" value={String(readyState.brief.callbacksToAttend)} icon={CalendarClock} detail={`${readyState.brief.overdueCallbacks} po termínu`} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <BriefDetail label="Today" value={`${formatDate(readyState.brief.daily.date)} • ${readyState.brief.daily.conversionRate.toFixed(1)}% conversion`} />
            <BriefDetail label="Open reminders" value={String(readyState.brief.openReminders)} href="/calendar" />
            {readyState.brief.teamWalletBalance === null ? (
              <BriefDetail label="Team wallet" value="Unavailable" href="/wallet" />
            ) : (
              <BriefDetail label="Team wallet" value={`${formatAmount(readyState.brief.teamWalletBalance, readyState.brief.walletCurrency || "CZK")} • ${readyState.brief.teamWalletTransactions} transactions`} href="/wallet" />
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Priority</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{readyState.brief.nextAction.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{readyState.brief.nextAction.description}</p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-600">Source: {readyState.brief.nextAction.source}</p>
            </div>
            <Link href={readyState.brief.nextAction.href} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white">
              Open action <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {readyState.warnings.length > 0 && <p role="status" className="text-[11px] text-amber-300/80">Částečný brief: {readyState.warnings.join(" ")}</p>}
        </>
      ) : null}
    </section>
  );
}

function BriefMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof PhoneCall;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500"><span>{label}</span><Icon className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" /></div>
      <p className="mt-2 font-mono text-xl font-semibold text-zinc-100">{value}</p>
      {detail && <p className="mt-1 text-[10px] text-zinc-500">{detail}</p>}
    </div>
  );
}

function BriefDetail({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = <><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></>;
  return href ? <Link href={href} className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700">{content}<span className="mt-2 inline-flex items-center gap-1 text-[10px] text-zinc-500">Open <ArrowRight className="h-3 w-3" aria-hidden="true" /></span></Link> : <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">{content}</div>;
}
