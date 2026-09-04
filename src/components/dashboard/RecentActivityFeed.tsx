"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock, PhoneCall, ShoppingBag, User } from "lucide-react";
import { getRecentActivityAction } from "@/app/actions/analytics";
import type { AnalyticsActionResult, RecentActivityEntry } from "@/lib/analytics";
import { formatCurrencyAmount } from "@/lib/currency";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCallOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "order_placed":
      return "Order placed";
    case "followup_scheduled":
      return "Follow-up scheduled";
    case "no_answer":
      return "No answer";
    case "objection":
      return "Fail";
    case "completed":
      return "Completed";
    default:
      return outcome.replaceAll("_", " ");
  }
}

function getOrderOutcomeLabel(outcome: string): string {
  return `${outcome.charAt(0).toUpperCase()}${outcome.slice(1)} order`;
}

export function RecentActivityFeed() {
  const [activity, setActivity] = useState<RecentActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsActionResult<RecentActivityEntry[]> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setIsLoading(true);
      try {
        const activityResult = await getRecentActivityAction();
        if (!cancelled) {
          setResult(activityResult);
          if (activityResult.ok) setActivity(activityResult.data);
        }
      } catch (error) {
        if (!cancelled) {
          setActivity([]);
          setResult({
            ok: false,
            code: "UNAVAILABLE",
            status: 503,
            message: error instanceof Error ? error.message : "Recent activity query failed",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
            Recent Workspace Activity
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Persisted calls and orders with workspace attribution
          </p>
        </div>

        <a
          href="/calls"
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
        >
          <span>View All Calls</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 text-xs text-zinc-400">
          Loading recent workspace activity...
        </div>
      ) : result && !result.ok ? (
        <div role="alert" className="rounded-lg bg-rose-950/20 border border-rose-900/60 p-4 space-y-2">
          <p className="text-xs font-medium text-rose-200">
            {result.code === "FORBIDDEN" ? "Recent activity forbidden" : "Recent activity unavailable"}
          </p>
          <p className="text-[11px] leading-relaxed text-rose-300">{result.message}</p>
        </div>
      ) : activity.length === 0 ? (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/60 p-4 space-y-2">
          <p className="text-xs font-medium text-zinc-200">No recent workspace activity</p>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Persisted calls and orders will appear here after they are attributed to the active workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activity.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700/80 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  {entry.type === "call" ? <PhoneCall className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-100 truncate">{entry.customerName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.operatorName}
                    </span>
                    {entry.type === "call" ? (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDuration(entry.durationSeconds || 0)}
                      </span>
                    ) : (
                      <span>{entry.productName}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                {entry.type === "call" && entry.sentiment && entry.sentiment !== "Neutral" && (
                  <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                    {entry.sentiment}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.type === "order" && entry.outcome === "completed" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                  {entry.type === "call" ? getCallOutcomeLabel(entry.outcome) : getOrderOutcomeLabel(entry.outcome)}
                  {entry.type === "order" && typeof entry.amount === "number" && (
                    <span className="font-mono text-zinc-200">({formatCurrencyAmount(entry.amount, entry.currency ?? "USD")})</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
