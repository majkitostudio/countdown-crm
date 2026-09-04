"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ListChecks, PhoneCall, RefreshCw } from "lucide-react";
import { listCalendarEntriesAction } from "@/app/actions/calendar";
import { getReorderOpportunities } from "@/lib/reorder";
import { resolveNextBestActionState, type NextBestAction } from "@/lib/nextBestAction";

export function NextBestActionCard() {
  const [action, setAction] = useState<NextBestAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      try {
        const [calendarResult, reorderOpportunities] = await Promise.all([
          listCalendarEntriesAction(),
          getReorderOpportunities(),
        ]);

        if (!cancelled) {
          const nextActionState = resolveNextBestActionState(calendarResult, reorderOpportunities);
          if (nextActionState.status === "unavailable") {
            setAction(null);
            setUnavailableMessage(nextActionState.message);
          } else {
            setAction(nextActionState.action);
            setUnavailableMessage(null);
          }
        }
      } catch {
        if (!cancelled) {
          setAction(null);
          setUnavailableMessage("Prioritní signály nejsou dostupné. Data nebyla nahrazena syntetickou prioritou.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSignals();
    return () => {
      cancelled = true;
    };
  }, []);

  const Icon = action?.kind === "callback"
    ? CalendarClock
    : action?.kind === "reorder"
      ? RefreshCw
      : ListChecks;

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-4" data-testid="next-best-action">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-300">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Next best action</h3>
            <p className="mt-0.5 text-xs text-zinc-400">Jedna prioritní akce z dostupných workspace signálů.</p>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-500">
          Explainable
        </span>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-400">Načítám priority…</div>
      ) : unavailableMessage ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">
          Prioritní signály nejsou dostupné: {unavailableMessage}
        </div>
      ) : action ? (
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">{action.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{action.description}</p>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-600">Source: {action.source}</p>
          </div>
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            Open action
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
