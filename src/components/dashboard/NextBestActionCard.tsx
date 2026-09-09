"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ListChecks, PhoneCall, RefreshCw } from "lucide-react";
import { loadNextBestActionAction } from "@/app/actions/nextBestAction";
import type { NextBestActionState } from "@/lib/nextBestAction";

export function NextBestActionContent({ state }: { state: NextBestActionState }) {
  if (state.status === "unavailable") {
    return (
      <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">
        Prioritní signály nejsou dostupné: {state.message}
      </div>
    );
  }

  const { action } = state;

  return (
    <div className="space-y-3">
      {state.status === "partial" ? (
        <div role="status" className="rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
          Partial recommendation: {state.message}
        </div>
      ) : null}
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
    </div>
  );
}

export function NextBestActionCard() {
  const [state, setState] = useState<NextBestActionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      try {
        const nextState = await loadNextBestActionAction();
        if (!cancelled) {
          setState(nextState);
        }
      } catch {
        if (!cancelled) {
          setState({
            status: "unavailable",
            unavailableSources: ["callbacks", "reorders"],
            message: "Data nebyla nahrazena syntetickou prioritou.",
          });
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

  const action = state && state.status !== "unavailable" ? state.action : null;
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
      ) : state ? <NextBestActionContent state={state} /> : null}
    </div>
  );
}
