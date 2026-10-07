"use client";

import { useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  getScheduledCallbacksBannerState,
  formatCallbackClockTime,
  type ScheduledCallbackItem,
} from "@/lib/scheduledCallbacksBanner";
import { Button } from "@/components/ui/Button";

interface OperatorScheduledCallbacksBannerProps {
  callbacks: ScheduledCallbackItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onClaimCallback?: () => void;
}

export function OperatorScheduledCallbacksBanner({
  callbacks,
  isLoading = false,
  onRefresh,
  onClaimCallback,
}: OperatorScheduledCallbacksBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const state = getScheduledCallbacksBannerState(callbacks);

  if (!state.hasCallbacks) {
    return null;
  }

  const isUrgent = state.urgency === "critical";

  return (
    <div
      className={`relative mb-4 overflow-hidden rounded-xl border transition-all ${
        isUrgent
          ? "border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          : "border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-zinc-900 to-zinc-950 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
      }`}
      data-testid="operator-scheduled-callbacks-banner"
      data-urgency={state.urgency}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              isUrgent
                ? "border-amber-400/40 bg-amber-500/20 text-amber-300"
                : "border-sky-400/40 bg-sky-500/20 text-sky-300"
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="h-4.5 w-4.5 animate-pulse" aria-hidden="true" />
            ) : (
              <CalendarClock className="h-4.5 w-4.5" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold sm:text-sm text-zinc-100">
                {state.headline}
              </span>
              {isUrgent && (
                <span className="rounded-md border border-amber-500/40 bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                  Vyžaduje pozornost
                </span>
              )}
            </div>
            {state.subtext && (
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                {state.subtext}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onClaimCallback && isUrgent && (
            <Button
              variant="primary"
              onClick={onClaimCallback}
              className="px-2.5 py-1.5 text-xs font-medium"
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Vyzvednout hovor</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="px-2.5 py-1.5 text-xs"
          >
            <span>{isExpanded ? "Skrýt přehled" : "Zobrazit přehled"}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            )}
          </Button>

          {onRefresh && (
            <Button
              variant="quiet"
              onClick={onRefresh}
              disabled={isLoading}
              title="Obnovit naplánované hovory"
              aria-label="Obnovit naplánované hovory"
              className="px-2 py-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-3 sm:px-4 sm:py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Odložené hovory k vyřízení
          </p>
          <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
            {state.items.map((item) => {
              const isOverdue = item.isOverdue;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock
                      className={`h-3.5 w-3.5 ${
                        isOverdue ? "text-amber-400" : "text-sky-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-zinc-200 tabular-nums">
                      {formatCallbackClockTime(item.scheduledAt)}
                    </span>
                    <span className="text-zinc-300">{item.leadName}</span>
                    {item.phone && (
                      <span className="hidden text-[11px] text-zinc-500 sm:inline">
                        {item.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isOverdue
                          ? "border border-amber-600/40 bg-amber-950/60 text-amber-300"
                          : "border border-zinc-700 bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {isOverdue ? "Po termínu" : "Naplánováno"}
                    </span>
                    {onClaimCallback && isOverdue && (
                      <button
                        type="button"
                        onClick={onClaimCallback}
                        className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
                      >
                        Vytočit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
