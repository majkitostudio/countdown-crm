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
  if (!Number.isFinite(date.getTime())) return "Nedostupné";

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
      return "Objednávka vytvořena";
    case "followup_scheduled":
      return "Hovor naplánován";
    case "no_answer":
      return "Nedostupný";
    case "objection":
    case "objection_handled":
      return "Neúspěšný";
    default:
      return value?.trim() || "Výsledek není zaznamenán";
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
      value: kind === "order" ? "Nikdy" : "Bez záznamu",
      detail: kind === "order" ? "Žádná zaznamenaná objednávka" : "Žádná uložená data",
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
    detail: activity.actor || "Neznámý operátor",
  };
}

export function RecentContextRow({ leadId, refreshToken }: RecentContextRowProps) {
  const [context, setContext] = useState<RecentContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduledCallUnavailableMessage, setScheduledCallUnavailableMessage] = useState<string | null>(null);

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
        setScheduledCallUnavailableMessage(
          recentContext.scheduledCallSource.state === "unavailable"
            ? recentContext.scheduledCallSource.message
            : null,
        );
      } catch (error) {
        if (!cancelled) {
          setContext(null);
          setScheduledCallUnavailableMessage(null);
          setLoadError(error instanceof Error ? error.message : "Poslední kontext se nepodařilo načíst.");
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

  const emptySignal = { value: "Bez záznamu", detail: "Žádná uložená data" };
  const contact = renderSignal(context?.lastContact || null, "contact");
  const result = renderSignal(context?.lastCallResult || null, "result");
  const order = renderSignal(context?.lastOrder || null, "order");
  const scheduledCall = scheduledCallUnavailableMessage
    ? { value: "Nedostupné", detail: scheduledCallUnavailableMessage }
    : context?.activeScheduledCall
      ? { value: formatDate(context.activeScheduledCall.scheduled_at), detail: "Naplánovaný hovor" }
      : emptySignal;

  return (
    <Surface variant="inset" className="w-full" data-testid="recent-context-row" aria-labelledby="recent-context-title">
      <section className="p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 id="recent-context-title" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Poslední události</h3>
          <p className="mt-1 text-xs text-zinc-400">Přehled před voláním — podrobnosti níže</p>
        </div>
        {isLoading && <StatusBadge tone="neutral">Načítání…</StatusBadge>}
      </div>

      {loadError ? (
        <StatusAlert tone="warning" className="w-full">
          Poslední kontext není dostupný: {loadError}
        </StatusAlert>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-busy={isLoading}>
          <Signal icon={PhoneCall} label="Poslední kontakt" value={isLoading ? "Načítání…" : contact.value} detail={isLoading ? "" : contact.detail} />
          <Signal icon={CheckCircle2} label="Poslední výsledek" value={isLoading ? "Načítání…" : result.value} detail={isLoading ? "" : result.detail} />
          <Signal icon={ShoppingBag} label="Poslední objednávka" value={isLoading ? "Načítání…" : order.value} detail={isLoading ? "" : order.detail} />
          <Signal icon={CalendarClock} label="Naplánovaný hovor" value={isLoading ? "Načítání…" : scheduledCall.value} detail={isLoading ? "" : scheduledCall.detail} />
        </div>
      )}
      </section>
    </Surface>
  );
}
