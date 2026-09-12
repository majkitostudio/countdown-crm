"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleSlash2,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import { getWorkspaceReadinessAction } from "@/app/actions/workspaceReadiness";
import type {
  ReadinessStatus,
  WorkspaceReadinessCheck,
  WorkspaceReadinessDTO,
} from "@/lib/dal/workspaceReadiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge as SharedStatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

const STATUS_COPY: Record<ReadinessStatus, { label: string; className: string }> = {
  ready: {
    label: "Ready",
    className: "border-emerald-800/70 bg-emerald-950/50 text-emerald-300",
  },
  needs_attention: {
    label: "Attention",
    className: "border-amber-800/70 bg-amber-950/50 text-amber-300",
  },
  blocked: {
    label: "Blocked",
    className: "border-rose-800/70 bg-rose-950/40 text-rose-300",
  },
};

function StatusIcon({ status }: { status: ReadinessStatus }) {
  if (status === "ready") return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
  if (status === "blocked") return <CircleSlash2 className="h-4 w-4 text-rose-400" aria-hidden="true" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />;
}

function ReadinessStatusBadge({ status }: { status: ReadinessStatus }) {
  const copy = STATUS_COPY[status];
  const tone: SemanticTone = status === "ready" ? "success" : status === "blocked" ? "danger" : "warning";
  return (
    <SharedStatusBadge tone={tone} className="gap-1.5">
      <StatusIcon status={status} />
      {copy.label}
    </SharedStatusBadge>
  );
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ReadinessCard({ check }: { check: WorkspaceReadinessCheck }) {
  return (
    <Surface variant="page">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">{check.label}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{check.summary}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ReadinessStatusBadge status={check.status} />
            <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </div>
        </summary>
        <div className="space-y-3 border-t border-zinc-800/80 px-5 pb-5 pt-4 text-xs">
          <p className="leading-relaxed text-zinc-400">{check.details}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-zinc-600">Evidence checked: {formatCheckedAt(check.checkedAt)}</span>
            {check.actionHref ? (
              <Link
                href={check.actionHref}
                className="inline-flex items-center rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
              >
                Open related area
              </Link>
            ) : null}
          </div>
        </div>
      </details>
    </Surface>
  );
}

export function WorkspaceReadinessPanel({ initialData }: { initialData: WorkspaceReadinessDTO }) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const readyCount = data.checks.filter((check) => check.status === "ready").length;
  const attentionCount = data.checks.filter((check) => check.status === "needs_attention").length;
  const blockedCount = data.checks.filter((check) => check.status === "blocked").length;

  const refresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      setData(await getWorkspaceReadinessAction());
    } catch {
      setRefreshError("Readiness checks could not be refreshed right now.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={ClipboardCheck}
        title="Workspace Readiness"
        badge={{ label: STATUS_COPY[data.overallStatus].label, tone: data.overallStatus === "ready" ? "success" : "unavailable" }}
        description="A truthful operational checklist. Missing evidence is shown as attention or blocked, never as a fake Ready state."
        actions={
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRefreshing ? "Refreshing..." : "Refresh checks"}
          </Button>
        }
      />

      {refreshError ? (
        <StatusAlert tone="danger">
          {refreshError}
        </StatusAlert>
      ) : null}

      <section aria-label="Readiness summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Ready" value={readyCount} valueTone="success" />
        <MetricCard label="Attention" value={attentionCount} valueTone="warning" />
        <MetricCard label="Blocked" value={blockedCount} valueTone="danger" />
      </section>

      <section aria-label="Workspace readiness checks" className="space-y-3">
        {data.checks.map((check) => <ReadinessCard key={check.key} check={check} />)}
      </section>

      <p className="text-right font-mono text-[10px] text-zinc-600">
        Last checked: {formatCheckedAt(data.checkedAt)} · Workspace: {data.workspaceId}
      </p>
    </div>
  );
}
