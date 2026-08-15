"use client";

import React from "react";
import {
  Zap,
  CheckCircle2,
  XCircle,
  SkipForward,
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
  X,
  Activity,
} from "lucide-react";
import {
  ExecutionLogEntry,
  ACTION_REGISTRY,
} from "@/lib/workflows/types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface PostCallSummaryCardProps {
  summary: {
    leadName: string;
    outcomeLabel: string;
    durationSeconds: number;
    orderStatus: "created" | "not_created";
    transcriptStatus: "unavailable";
    orderId?: string;
    workflowEntries: ExecutionLogEntry[];
  };
  onDismiss: () => void;
  onNextLead: () => void;
}

// ─── Action Icon Map ────────────────────────────────────────────────────────

const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function PostCallSummaryCard({ summary, onDismiss, onNextLead }: PostCallSummaryCardProps) {
  const { workflowEntries: entries } = summary;
  const successCount = entries.filter((e) => e.status === "success").length;
  const failureCount = entries.filter((e) => e.status === "failure").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;

  return (
    <div className="bg-zinc-900/80 border border-zinc-700/80 rounded-xl p-4 shadow-xl backdrop-blur-sm space-y-3 animate-in fade-in slide-in-from-top-3 duration-400">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <Zap className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Post-call summary
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">
              {summary.leadName} • {summary.outcomeLabel} • {Math.round(summary.durationSeconds / 60)}m
              {failureCount > 0 && ` • ${failureCount} failed`}
              {skippedCount > 0 && ` • ${skippedCount} skipped`}
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Outcome</span>
          <strong className="mt-1 block text-zinc-100">{summary.outcomeLabel}</strong>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Order</span>
          <strong className="mt-1 block text-zinc-100">
            {summary.orderStatus === "created" ? "Created" : "Not created"}
            {summary.orderId && (
              <span className="block mt-1 text-[10px] font-mono text-zinc-500">#{summary.orderId}</span>
            )}
          </strong>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Automation</span>
          <strong className="mt-1 block text-zinc-100">{successCount} succeeded</strong>
        </div>
      </div>

      {summary.transcriptStatus === "unavailable" && (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-xs text-amber-200" role="status">
          <strong className="font-semibold">Call transcript unavailable.</strong>
          <span className="ml-1 text-amber-300/80">This call did not capture a verified speech transcript or recording.</span>
        </div>
      )}

      {/* Executed Rules */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const StatusIcon =
            entry.status === "success"
              ? CheckCircle2
              : entry.status === "failure"
              ? XCircle
              : SkipForward;

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-zinc-950/60 border-zinc-800/80 transition-all"
            >
              <StatusIcon className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    {entry.ruleName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <span
                      className={
                        entry.status === "success"
                          ? "w-1.5 h-1.5 rounded-full bg-emerald-500"
                          : entry.status === "failure"
                          ? "w-1.5 h-1.5 rounded-full bg-rose-500"
                          : "w-1.5 h-1.5 rounded-full bg-zinc-500"
                      }
                    />
                    {entry.status === "success"
                      ? "Spuštěno"
                      : entry.status === "failure"
                      ? "Selhalo"
                      : "Přeskočeno"}
                  </span>
                </div>

                {/* Executed Actions */}
                {entry.executedActions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {entry.executedActions.map((actionType) => {
                      const def = ACTION_REGISTRY.find((a) => a.type === actionType);
                      if (!def) return null;
                      const ActionIcon = ACTION_ICON_MAP[def.icon] || Activity;
                      return (
                        <span
                          key={actionType}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-medium rounded-md"
                        >
                          <ActionIcon className="w-3 h-3" />
                          {def.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Error message */}
                {entry.errorMessage && (
                  <p className="text-[10px] text-rose-400 mt-1 font-mono">
                    {entry.errorMessage}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-3">
        <span className="text-[10px] text-zinc-500 font-mono">
          {new Date().toLocaleString("cs-CZ")}
        </span>
        <div className="flex items-center gap-3">
          <a href="/workflows" className="text-[10px] text-zinc-400 hover:text-zinc-200 font-medium transition-colors">
            View automations →
          </a>
          <button onClick={onNextLead} className="rounded-lg bg-zinc-100 px-3 py-2 text-[11px] font-semibold text-zinc-950 hover:bg-white">
            Continue to next lead
          </button>
        </div>
      </div>
    </div>
  );
}
