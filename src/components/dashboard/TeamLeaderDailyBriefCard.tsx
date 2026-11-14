"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Coins, PhoneCall } from "lucide-react";
import { loadDashboardDailyBriefAction, type DashboardDailyBriefActionResult } from "@/app/actions/dashboard";
import { formatCurrencyAmounts } from "@/lib/currency";

type BriefState = DashboardDailyBriefActionResult | { status: "loading" };

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
        const result = await loadDashboardDailyBriefAction();
        setState({
          ...result,
        });
      } catch {
        if (!cancelled) setState({ status: "unavailable", message: "Denní souhrn není momentálně dostupný." });
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
            <h2 className="text-sm font-semibold text-zinc-100">Denní souhrn vedoucího týmu</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Přehled dnešních aktivit v rozsahu: {readyState?.brief.scopeLabel ?? "ověřuji rozsah"}. Peněženka je společná za celý pracovní prostor.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {readyState && <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-400">{readyState.brief.scopeLabel}</span>}
          <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-500">Pouze ke čtení</span>
        </div>
      </div>

      {state.status === "loading" ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-400">Načítám dnešní souhrn…</div>
      ) : state.status === "forbidden" ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">Denní souhrn je dostupný pouze vedoucím týmů a administrátorům.</div>
      ) : state.status === "unavailable" ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">Denní souhrn není dostupný: {state.message}</div>
      ) : readyState ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BriefMetric label="Dnešní hovory" value={String(readyState.brief.daily.calls)} icon={PhoneCall} />
            <BriefMetric label="Dnešní objednávky" value={String(readyState.brief.daily.completedOrders)} icon={CheckCircle2} />
            <BriefMetric label="Dnešní příjmy" value={formatCurrencyAmounts(readyState.brief.daily.revenueByCurrency)} icon={Coins} />
            <BriefMetric label="Naplánované hovory" value={String(readyState.brief.scheduledCallsToAttend)} icon={CalendarClock} detail={`${readyState.brief.overdueScheduledCalls} po termínu`} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <BriefDetail label="Dnes" value={`${formatDate(readyState.brief.daily.date)} • Konverze ${readyState.brief.daily.conversionRate.toFixed(1)} %`} />
            <BriefDetail label="Otevřené připomínky" value={String(readyState.brief.openReminders)} href="/schedule" />
            <BriefDetail
              label="Ke kontrole"
              value={readyState.brief.pendingReviews === null
                ? "Nedostupné"
                : readyState.brief.pendingReviews === 0
                  ? "Všechny hovory zkontrolovány"
                  : String(readyState.brief.pendingReviews)}
              href="/call-logs?review=unreviewed"
            />
            {readyState.brief.workspaceWalletBalance === null ? (
              <BriefDetail label="Celofiremní peněženka" value="Nedostupná" href="/wallet" />
            ) : (
              <BriefDetail label="Celofiremní peněženka" value={`${formatAmount(readyState.brief.workspaceWalletBalance, readyState.brief.walletCurrency || "CZK")} • ${readyState.brief.workspaceWalletTransactions} transakcí`} href="/wallet" />
            )}
          </div>

          {readyState.warnings.length > 0 && <p role="status" className="text-[11px] text-amber-300/80">Částečný souhrn: {readyState.warnings.join(" ")}</p>}
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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400"><span className="min-w-0 break-words">{label}</span><Icon className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden="true" /></div>
      <p className="mt-2 font-mono text-lg font-semibold text-zinc-100 break-words">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-zinc-400 break-words">{detail}</p>}
    </div>
  );
}

function BriefDetail({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = <><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></>;
  return href ? <Link href={href} className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 transition-colors duration-150 ease-interface hover:border-zinc-700">{content}<span className="mt-2 inline-flex items-center gap-1 text-[10px] text-zinc-500">Otevřít <ArrowRight className="h-3 w-3" aria-hidden="true" /></span></Link> : <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">{content}</div>;
}
