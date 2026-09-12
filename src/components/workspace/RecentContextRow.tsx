"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, PhoneCall, ShoppingBag } from "lucide-react";
import { listCalendarEntriesAction } from "@/app/actions/calendar";
import { getLeadActivities } from "@/lib/domainActivity";
import { formatCurrencyAmount } from "@/lib/currency";
import type { WorkspaceActivity } from "@/lib/domain";
import { buildRecentContextFromCalendar, type RecentContextData } from "./recentContext";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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
}: {
  icon: typeof PhoneCall;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Surface variant="inset" className="w-full">
      <div className="min-w-0 px-2.5 py-2.5">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        <Icon className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 truncate text-[10px] tabular-nums text-zinc-500">{detail}</p>
      </div>
    </Surface>
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
  const [callbackUnavailableMessage, setCallbackUnavailableMessage] = useState<string | null>(null);

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

        const recentContext = buildRecentContextFromCalendar(leadId, activities, calendarResult);
        setContext(recentContext.context);
        setCallbackUnavailableMessage(
          recentContext.callbackSource.state === "unavailable"
            ? recentContext.callbackSource.message
            : null,
        );
      } catch (error) {
        if (!cancelled) {
          setContext(null);
          setCallbackUnavailableMessage(null);
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
  const callback = callbackUnavailableMessage
    ? { value: "Unavailable", detail: callbackUnavailableMessage }
    : context?.activeCallback
      ? { value: formatDate(context.activeCallback.scheduled_at), detail: "Scheduled callback" }
      : emptySignal;

  return (
    <Surface variant="inset" className="w-full" data-testid="recent-context-row" aria-labelledby="recent-context-title">
      <section className="p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 id="recent-context-title" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Last signals</h3>
          <p className="mt-1 text-[11px] text-zinc-500">Glance before you dial — details below</p>
        </div>
        {isLoading && <StatusBadge tone="neutral">Loading…</StatusBadge>}
      </div>

      {loadError ? (
        <StatusAlert tone="warning" className="w-full">
          Recent context unavailable: {loadError}
        </StatusAlert>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-busy={isLoading}>
          <Signal icon={PhoneCall} label="Last contact" value={isLoading ? "Loading…" : contact.value} detail={isLoading ? "" : contact.detail} />
          <Signal icon={CheckCircle2} label="Last result" value={isLoading ? "Loading…" : result.value} detail={isLoading ? "" : result.detail} />
          <Signal icon={ShoppingBag} label="Last order" value={isLoading ? "Loading…" : order.value} detail={isLoading ? "" : order.detail} />
          <Signal icon={CalendarClock} label="Active callback" value={isLoading ? "Loading…" : callback.value} detail={isLoading ? "" : callback.detail} />
        </div>
      )}
      </section>
    </Surface>
  );
}
