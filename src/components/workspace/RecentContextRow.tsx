"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, ShoppingBag } from "lucide-react";
import { listCalendarEntriesAction } from "@/app/actions/calendar";
import { getLeadActivities } from "@/lib/domainActivity";
import { formatCurrencyAmount } from "@/lib/currency";
import type { WorkspaceActivity } from "@/lib/domain";
import { buildRecentContext, type RecentContextData } from "./recentContext";

interface RecentContextRowProps {
  leadId: string;
  refreshToken: number;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function outcomeLabel(value: string | undefined): string {
  switch (value) {
    case "order_placed":
      return "Order placed";
    case "followup_scheduled":
      return "Follow-up scheduled";
    case "no_answer":
      return "No answer";
    case "objection":
    case "objection_handled":
      return "Fail";
    default:
      return value?.trim() || "No result recorded";
  }
}

function orderLabel(activity: WorkspaceActivity): string {
  const amount = activity.metadata?.order_value;
  if (amount === undefined) return activity.title;
  return formatCurrencyAmount(amount, activity.metadata?.order_currency || "CZK");
}

function Signal({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof PhoneCall;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "attention";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800/70 bg-zinc-950/50 px-2.5 py-2.5">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-1.5 truncate text-xs font-medium ${tone === "attention" ? "text-amber-200" : "text-zinc-200"}`}>{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-zinc-600">{detail}</p>
    </div>
  );
}

function renderSignal(signal: RecentContextData["lastContact"], kind: "contact" | "result" | "order") {
  if (!signal) {
    return {
      value: "No record",
      detail: "No data saved",
    };
  }

  const activity = signal.activity;
  if (kind === "result") {
    return {
      value: outcomeLabel(activity.metadata?.call_outcome),
      detail: formatDate(activity.timestamp),
    };
  }
  if (kind === "order") {
    return {
      value: orderLabel(activity),
      detail: formatDate(activity.timestamp),
    };
  }
  return {
    value: formatDate(activity.timestamp),
    detail: activity.actor || "Unknown operator",
  };
}

export function RecentContextRow({ leadId, refreshToken }: RecentContextRowProps) {
  const [context, setContext] = useState<RecentContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [activities, calendarResult] = await Promise.all([
          getLeadActivities(leadId),
          listCalendarEntriesAction(),
        ]);
        if (cancelled) return;

        setContext(buildRecentContext(
          leadId,
          activities,
          calendarResult.entries
            .filter((entry) => entry.type === "callback" && entry.lead)
            .map((entry) => ({
              id: entry.id,
              lead_id: entry.lead!.id,
              scheduled_at: entry.starts_at,
            })),
        ));
      } catch (error) {
        if (!cancelled) {
          setContext(null);
          setLoadError(error instanceof Error ? error.message : "Recent context could not be loaded.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [leadId, refreshToken]);

  const emptySignal = { value: "No record", detail: "No data saved" };
  const contact = renderSignal(context?.lastContact || null, "contact");
  const result = renderSignal(context?.lastCallResult || null, "result");
  const order = renderSignal(context?.lastOrder || null, "order");
  const callback = context?.activeCallback
    ? { value: formatDate(context.activeCallback.scheduled_at), detail: "Scheduled callback" }
    : emptySignal;

  return (
    <section className="rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3" data-testid="recent-context-row" aria-labelledby="recent-context-title">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 id="recent-context-title" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recent context</h3>
          <p className="mt-1 text-[11px] text-zinc-600">Four signals before the next action</p>
        </div>
        {isLoading && <span className="text-[10px] font-mono text-zinc-600">Loading…</span>}
      </div>

      {loadError ? (
        <div role="alert" className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-2.5 text-[11px] text-amber-200">
          Recent context unavailable: {loadError}
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-busy={isLoading}>
          <Signal icon={PhoneCall} label="Last contact" value={isLoading ? "Loading…" : contact.value} detail={isLoading ? "" : contact.detail} />
          <Signal icon={CheckCircle2} label="Last result" value={isLoading ? "Loading…" : result.value} detail={isLoading ? "" : result.detail} />
          <Signal icon={ShoppingBag} label="Last order" value={isLoading ? "Loading…" : order.value} detail={isLoading ? "" : order.detail} />
          <Signal icon={CalendarClock} label="Active callback" value={isLoading ? "Loading…" : callback.value} detail={isLoading ? "" : callback.detail} tone={context?.activeCallback ? "attention" : "default"} />
        </div>
      )}
    </section>
  );
}
