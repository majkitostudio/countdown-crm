import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ReadinessStatus,
  WorkspaceReadinessCheck,
} from "@/lib/dal/workspaceReadiness";
import { Surface } from "@/components/ui/Surface";

/**
 * Compact health strip shown at the top of Management (Administration).
 * Replaces the standalone /controls (Readiness) page — instead of a full
 * technical checklist it surfaces only the actionable business checks with a
 * link to the place where the administrator can fix them.
 *
 * Technical probes (migrations, RLS matrix, Telnyx, Local SIP) are intentionally
 * left out: telephony is parked and the deployment evidence is a rollout concern,
 * not a daily workspace action.
 */

const BUSINESS_CHECK_KEYS = new Set<
  WorkspaceReadinessCheck["key"]
>([
  "calendar",
  "wallet",
  "lead_queue",
  "published_scripts",
  "workflows",
  "critical_errors",
]);

const CHECK_COPY: Record<string, { label: string; actionLabel: string }> = {
  calendar: { label: "Kalendář a naplánované hovory", actionLabel: "Open Schedule" },
  wallet: { label: "Wallet", actionLabel: "Open Wallet" },
  lead_queue: { label: "Fronta leadů", actionLabel: "Open Console" },
  published_scripts: { label: "Skripty produktů", actionLabel: "Open Scripts" },
  workflows: { label: "Automations", actionLabel: "Open Automations" },
  critical_errors: { label: "Kritické chyby v auditu", actionLabel: "Open Audit Log" },
};

const ISSUE_COPY: Record<string, string> = {
  calendar: "Zdroje kalendáře nejsou plně dostupné.",
  wallet: "Wallet není plně dostupný.",
  lead_queue: "Frontu leadů se nepodařilo načíst.",
  published_scripts: "Některé produkty nemají publikovaný prodejní skript.",
  workflows: "Některé aktivní spouštěče automatizací jsou nedostupné.",
  critical_errors: "V posledních 24 hodinách jsou kritické chyby ke kontrole.",
};

const STATUS_COPY: Record<
  ReadinessStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ready: {
    label: "Ready",
    className: "border-emerald-800/70 bg-emerald-950/50 text-emerald-300",
    icon: CheckCircle2,
  },
  needs_attention: {
    label: "Attention",
    className: "border-amber-800/70 bg-amber-950/50 text-amber-300",
    icon: AlertTriangle,
  },
  blocked: {
    label: "Blocked",
    className: "border-rose-800/70 bg-rose-950/50 text-rose-300",
    icon: CircleSlash2,
  },
};

function overallStatus(openChecks: WorkspaceReadinessCheck[]): ReadinessStatus {
  if (openChecks.some((check) => check.status === "blocked")) return "blocked";
  if (openChecks.length > 0) return "needs_attention";
  return "ready";
}

export function WorkspaceHealthStrip({
  checks,
}: {
  checks: WorkspaceReadinessCheck[];
}) {
  const businessChecks = checks.filter((check) => BUSINESS_CHECK_KEYS.has(check.key));
  const openChecks = businessChecks.filter((check) => check.status !== "ready");
  const status = overallStatus(openChecks);
  const StatusIcon = STATUS_COPY[status].icon;

  return (
    <div
      className={cn(
        "border-l-2",
        status === "ready" && "border-l-emerald-700",
        status === "needs_attention" && "border-l-amber-600",
        status === "blocked" && "border-l-rose-600",
      )}
    >
      <Surface variant="page">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Activity className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-zinc-100">Workspace health</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide",
              STATUS_COPY[status].className,
            )}
          >
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {STATUS_COPY[status].label}
          </span>
        </div>
        {openChecks.length > 0 && (
          <span className="shrink-0 text-[11px] text-zinc-500">
            {openChecks.length} otevřen{openChecks.length === 1 ? "á" : "é"} kontrol{openChecks.length === 1 ? "a" : "y"}
          </span>
        )}
      </div>

      {openChecks.length === 0 ? (
        <div className="flex items-center gap-2 px-4 pb-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <p className="text-xs text-zinc-400">
            Všechny provozní kontroly jsou v pořádku.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70 border-t border-zinc-800/70">
          {openChecks.map((check) => {
            const copy = CHECK_COPY[check.key];
            const issueText = ISSUE_COPY[check.key];
            const checkBadge = STATUS_COPY[check.status];
            const CheckStatusIcon = checkBadge.icon;
            return (
              <li
                key={check.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide",
                    checkBadge.className,
                  )}
                >
                  <CheckStatusIcon className="h-2.5 w-2.5" aria-hidden="true" />
                  {checkBadge.label}
                </span>
                <span className="text-xs font-medium text-zinc-200">{copy?.label}</span>
                <span className="text-[11px] text-zinc-500">
                  {issueText ?? check.summary}
                </span>
                {check.actionHref && (
                  <Link
                    href={check.actionHref}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 transition-colors hover:text-white"
                  >
                    {copy?.actionLabel ?? "Open"}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      </Surface>
    </div>
  );
}