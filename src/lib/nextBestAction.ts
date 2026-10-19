export interface NextBestActionScheduledCall {
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
  kind: "scheduled_call" | "reorder" | "queue";
  title: string;
  description: string;
  href: string;
  source: "scheduled call" | "re-order estimate" | "lead queue";
  source_id: string | null;
}

export interface NextBestActionInput {
  scheduledCalls?: NextBestActionScheduledCall[];
  reorderOpportunities?: NextBestActionReorderOpportunity[];
  now?: Date;
}

export type NextBestActionSource<T> =
  | { state: "available"; data: T }
  | { state: "unavailable"; message: string };

export type NextBestActionSourceName = "scheduledCalls" | "reorders";

export type NextBestActionState =
  | { status: "ready"; action: NextBestAction }
  | {
      status: "partial";
      action: NextBestAction;
      unavailableSources: NextBestActionSourceName[];
      message: string;
    }
  | {
      status: "unavailable";
      unavailableSources: NextBestActionSourceName[];
      message: string;
    };

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function formatScheduledCallTiming(scheduledAt: string, now: Date): string {
  const diffMinutes = Math.max(0, Math.round((Date.parse(scheduledAt) - now.getTime()) / 60000));
  if (diffMinutes <= 0) return "Naplánovaný hovor je po termínu.";
  if (diffMinutes < 60) return `Naplánovaný hovor za ${diffMinutes} min.`;
  const hours = Math.round(diffMinutes / 60);
  return `Naplánovaný hovor za ${hours} h.`;
}

/** Selects one explainable next step from persisted scheduled calls and re-order estimates. */
export function getNextBestAction(input: NextBestActionInput = {}): NextBestAction {
  const now = input.now ?? new Date();
  const scheduledCalls = (input.scheduledCalls ?? [])
    .filter((scheduledCall) => scheduledCall.lead_id && scheduledCall.lead_name && isValidDate(scheduledCall.scheduled_at))
    .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at));
  const dueScheduledCall = scheduledCalls.find((scheduledCall) => Date.parse(scheduledCall.scheduled_at) <= now.getTime() + 24 * 60 * 60 * 1000);

  if (dueScheduledCall) {
    return {
      kind: "scheduled_call",
      title: `Navázat na naplánovaný hovor: ${dueScheduledCall.lead_name}`,
      description: formatScheduledCallTiming(dueScheduledCall.scheduled_at, now),
      href: `/console?leadId=${encodeURIComponent(dueScheduledCall.lead_id)}`,
      source: "scheduled call",
      source_id: dueScheduledCall.id,
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
      href: `/console?leadId=${encodeURIComponent(reorder.lead_id)}`,
      source: "re-order estimate",
      source_id: reorder.id,
    };
  }

  return {
    kind: "queue",
    title: "Claim next lead",
    description: "Nejsou k dispozici urgentní naplánované hovory ani re-order odhady.",
    href: "/console",
    source: "lead queue",
    source_id: null,
  };
}

export function resolveNextBestActionState(
  scheduledCallsSource: NextBestActionSource<NextBestActionScheduledCall[]>,
  reordersSource: NextBestActionSource<NextBestActionReorderOpportunity[]>,
  now?: Date,
): NextBestActionState {
  const unavailableSources: NextBestActionSourceName[] = [];
  const unavailableMessages: string[] = [];

  if (scheduledCallsSource.state === "unavailable") {
    unavailableSources.push("scheduledCalls");
    unavailableMessages.push(scheduledCallsSource.message);
  }
  if (reordersSource.state === "unavailable") {
    unavailableSources.push("reorders");
    unavailableMessages.push(reordersSource.message);
  }

  const action = getNextBestAction({
    scheduledCalls: scheduledCallsSource.state === "available" ? scheduledCallsSource.data : [],
    reorderOpportunities: reordersSource.state === "available" ? reordersSource.data : [],
    now,
  });

  if (unavailableSources.length === 0) {
    return { status: "ready", action };
  }

  const message = unavailableMessages.join(" ");
  const actionIsSupportedByAvailableSource =
    (action.kind === "scheduled_call" && scheduledCallsSource.state === "available")
    || (action.kind === "reorder" && reordersSource.state === "available");

  if (actionIsSupportedByAvailableSource) {
    return { status: "partial", action, unavailableSources, message };
  }

  return {
    status: "unavailable",
    unavailableSources,
    message,
  };
}
