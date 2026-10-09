"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Coins, PhoneCall } from "lucide-react";
import { loadDashboardDailyBriefAction, type DashboardDailyBriefActionResult } from "@/app/actions/dashboard";
import { formatCurrencyAmounts } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

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
  const [retryKey, setRetryKey] = useState(0);
  const readyState = state.status === "ready" ? state : null;

  useEffect(() => {
    let cancelled = false;

    async function loadBrief() {
      try {
        const result = await loadDashboardDailyBriefAction();
        if (!cancelled) setState(result);
      } catch {
        if (!cancelled) setState({ status: "unavailable", message: "Daily Brief není momentálně dostupný." });
      }
    }

    void loadBrief();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6" data-testid="team-leader-daily-brief">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Denní přehled</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Dnešní aktivity · {readyState?.brief.scopeLabel ?? "ověřuji rozsah"}. Peněženka zobrazuje souhrn celého workspace.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {readyState && <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-400">{readyState.brief.scopeLabel}</span>}
          <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-500">Pouze ke čtení</span>
        </div>
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-label="Načítám denní přehled" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-800/60 bg-zinc-950/60 motion-reduce:animate-none" />
          ))}
        </div>
      ) : state.status === "forbidden" ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-400">Tento přehled je dostupný pouze vedoucím týmů a administrátorům.</div>
      ) : state.status === "unavailable" ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-400">
          <span>Souhrn se nepodařilo načíst. {state.message}</span>
          <Button variant="secondary" onClick={() => {
            setState({ status: "loading" });
            setRetryKey((key) => key + 1);
          }}>
            Zkusit znovu
          </Button>
        </div>
      ) : readyState ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BriefMetric label="Dnešní hovory" value={String(readyState.brief.daily.calls)} icon={PhoneCall} />
            <BriefMetric label="Dokončené objednávky" value={String(readyState.brief.daily.completedOrders)} icon={CheckCircle2} />
            <BriefMetric label="Tržby dnes" value={formatCurrencyAmounts(readyState.brief.daily.revenueByCurrency)} icon={Coins} />
            <BriefMetric label="Naplánovaná volání" value={String(readyState.brief.callbacksToAttend)} icon={CalendarClock} detail={`${readyState.brief.overdueCallbacks} po termínu`} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <BriefDetail label="Úspěšnost · dnes" value={`${formatDate(readyState.brief.daily.date)} · ${readyState.brief.daily.conversionRate.toFixed(1)} %`} />
            <BriefDetail label="Otevřené připomínky" value={String(readyState.brief.openReminders)} href="/calendar" />
            <BriefDetail
              label="Hovory ke kontrole"
              value={readyState.brief.pendingReviews === null
                ? "Nedostupné"
                : readyState.brief.pendingReviews === 0
                  ? "Všechny hovory zkontrolovány"
                  : String(readyState.brief.pendingReviews)}
              href="/calls?review=unreviewed"
            />
            {readyState.brief.workspaceWalletBalance === null ? (
              <BriefDetail label="Celofiremní peněženka" value="Nedostupná" href="/wallet" />
            ) : (
              <BriefDetail label="Celofiremní peněženka" value={`${formatAmount(readyState.brief.workspaceWalletBalance, readyState.brief.walletCurrency || "CZK")} • ${readyState.brief.workspaceWalletTransactions} transakcí`} href="/wallet" />
            )}
          </div>

          {readyState.warnings.length > 0 && <p role="status" className="text-[11px] text-amber-300/80">Částečný přehled: {readyState.warnings.join(" ")}</p>}
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
      <p className="mt-2 font-mono text-lg font-semibold text-zinc-100">{value}</p>
      {detail && <p className="mt-1 text-[10px] text-zinc-500">{detail}</p>}
    </div>
  );
}

function BriefDetail({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = <><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 text-xs text-zinc-300">{value}</p></>;
  return href ? <Link href={href} className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700">{content}<span className="mt-2 inline-flex items-center gap-1 text-[10px] text-zinc-500">Open <ArrowRight className="h-3 w-3" aria-hidden="true" /></span></Link> : <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">{content}</div>;
}
