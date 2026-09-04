import type { CalendarLoadResult } from "@/lib/dal/calendar";

export interface NextBestActionCallback {
  id: string;
  lead_id: string;
  lead_name: string;
  scheduled_at: string;
}

export interface NextBestActionReorderOpportunity {
  id: string;
  lead_id: string;
  lead_name: string;
  product_title: string;
  days_remaining: number;
  urgency: "urgent" | "due_soon" | "upcoming";
}

export interface NextBestAction {
  kind: "callback" | "reorder" | "queue";
  title: string;
  description: string;
  href: string;
  source: "scheduled callback" | "re-order estimate" | "lead queue";
  source_id: string | null;
}

export interface NextBestActionInput {
  callbacks?: NextBestActionCallback[];
  reorderOpportunities?: NextBestActionReorderOpportunity[];
  now?: Date;
}

export type NextBestActionState =
  | { status: "ready"; action: NextBestAction }
  | { status: "unavailable"; message: string };

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function formatCallbackTiming(scheduledAt: string, now: Date): string {
  const diffMinutes = Math.max(0, Math.round((Date.parse(scheduledAt) - now.getTime()) / 60000));
  if (diffMinutes <= 0) return "Callback je po termínu.";
  if (diffMinutes < 60) return `Callback za ${diffMinutes} min.`;
  const hours = Math.round(diffMinutes / 60);
  return `Callback za ${hours} h.`;
}

/** Selects one explainable next step from persisted callbacks and re-order estimates. */
export function getNextBestAction(input: NextBestActionInput = {}): NextBestAction {
  const now = input.now ?? new Date();
  const callbacks = (input.callbacks ?? [])
    .filter((callback) => callback.lead_id && callback.lead_name && isValidDate(callback.scheduled_at))
    .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at));
  const dueCallback = callbacks.find((callback) => Date.parse(callback.scheduled_at) <= now.getTime() + 24 * 60 * 60 * 1000);

  if (dueCallback) {
    return {
      kind: "callback",
      title: `Navázat na callback: ${dueCallback.lead_name}`,
      description: formatCallbackTiming(dueCallback.scheduled_at, now),
      href: `/workspace?leadId=${encodeURIComponent(dueCallback.lead_id)}`,
      source: "scheduled callback",
      source_id: dueCallback.id,
    };
  }

  const reorder = (input.reorderOpportunities ?? []).find(
    (opportunity) => opportunity.lead_id && opportunity.urgency === "urgent",
  ) ?? (input.reorderOpportunities ?? []).find(
    (opportunity) => opportunity.lead_id && opportunity.urgency === "due_soon",
  );

  if (reorder) {
    return {
      kind: "reorder",
      title: `Doplnit objednávku: ${reorder.lead_name}`,
      description: `${reorder.product_title} • odhad spotřeby za ${Math.max(0, reorder.days_remaining)} dní.`,
      href: `/workspace?leadId=${encodeURIComponent(reorder.lead_id)}`,
      source: "re-order estimate",
      source_id: reorder.id,
    };
  }

  return {
    kind: "queue",
    title: "Claim next lead",
    description: "Nejsou k dispozici urgentní callbacky ani re-order odhady.",
    href: "/workspace",
    source: "lead queue",
    source_id: null,
  };
}

export function resolveNextBestActionState(
  calendarResult: Pick<CalendarLoadResult, "entries" | "sources">,
  reorderOpportunities: NextBestActionReorderOpportunity[] = [],
  now?: Date,
): NextBestActionState {
  if (calendarResult.sources.callbacks.state === "unavailable") {
    return {
      status: "unavailable",
      message: calendarResult.sources.callbacks.message,
    };
  }

  const callbacks = calendarResult.entries
    .filter((entry) => entry.type === "callback" && entry.lead)
    .map((entry) => ({
      id: entry.id,
      lead_id: entry.lead!.id,
      lead_name: entry.lead!.full_name,
      scheduled_at: entry.starts_at,
    }));

  return {
    status: "ready",
    action: getNextBestAction({ callbacks, reorderOpportunities, now }),
  };
}
