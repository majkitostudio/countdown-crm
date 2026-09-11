import {
  BookOpenCheck,
  CalendarClock,
  MessageSquareText,
  PhoneCall,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import type { ConversationBriefDTO } from "@/lib/dal/conversationBrief";

interface ConversationBriefCardProps {
  brief: ConversationBriefDTO | null;
  isLoading: boolean;
  error: string | null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}m ${safeSeconds % 60}s`;
}

function outcomeLabel(outcome: NonNullable<ConversationBriefDTO["last_outcome"]>["outcome"]): string {
  switch (outcome) {
    case "order_placed":
      return "Order placed";
    case "followup_scheduled":
      return "Follow-up scheduled";
    case "no_answer":
      return "No answer";
    case "objection":
      return "Not completed";
    case "completed":
      return "Completed";
  }
}

function unavailableMessages(brief: ConversationBriefDTO): string[] {
  return Object.values(brief.sources)
    .filter((source): source is Extract<typeof source, { state: "unavailable" }> => source.state === "unavailable")
    .map((source) => source.message)
    .filter((message, index, messages) => messages.indexOf(message) === index);
}

export function ConversationBriefCard({ brief, isLoading, error }: ConversationBriefCardProps) {
  if (isLoading) {
    return (
      <Surface variant="page" aria-busy="true">
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Conversation Brief</p>
          <p className="mt-2 text-xs text-zinc-500">Loading recorded customer context…</p>
        </div>
      </Surface>
    );
  }

  if (error || !brief) {
    return (
      <StatusAlert tone="warning">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-300" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Conversation Brief unavailable</p>
            <p className="mt-1 text-xs text-amber-100/80">{error || "Recorded customer context could not be loaded."}</p>
          </div>
        </div>
      </StatusAlert>
    );
  }

  const unavailable = unavailableMessages(brief);
  const callUnavailable = brief.sources.call.state === "unavailable";
  const callbackUnavailable = brief.sources.callback.state === "unavailable";
  const noteUnavailable = brief.sources.note.state === "unavailable";
  const orderUnavailable = brief.sources.order.state === "unavailable";

  return (
    <Surface
      variant="page"
      aria-labelledby="conversation-brief-title"
      data-testid="conversation-brief"
    >
      <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Read before you dial</p>
          <h2 id="conversation-brief-title" className="mt-1 text-[15px] font-semibold tracking-tight text-white">Conversation Brief</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Recorded facts · {brief.lead.full_name}</p>
        </div>
        <StatusBadge tone="neutral">
          Server context
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Surface variant="inset">
          <div className="p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">What matters to them</p>
          <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-zinc-100">{brief.lead.problem || "Not recorded"}</p>
          {brief.queue_reason && <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">Why you got this lead: {brief.queue_reason}</p>}
          {brief.sources.queue_reason.state === "unavailable" && <p className="mt-2 text-[10px] text-amber-300">{brief.sources.queue_reason.message}</p>}
          </div>
        </Surface>

        <Surface variant="inset">
          <div className="p-3">
          <div className="flex items-start gap-2">
            <BookOpenCheck className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Safe next step</p>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-white">{brief.next_safe_step.label}</p>
            </div>
          </div>
          </div>
        </Surface>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Surface variant="inset">
          <div className="p-3">
          <PhoneCall className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Last contact</p>
          {callUnavailable ? (
            <p className="mt-1 text-[11px] text-amber-300">Unavailable</p>
          ) : brief.last_contact && brief.last_outcome ? (
            <>
              <p className="mt-1 text-xs font-semibold text-zinc-100">{outcomeLabel(brief.last_outcome.outcome)}</p>
              <p className="mt-0.5 text-[10px] tabular-nums text-zinc-400">{formatDate(brief.last_contact.occurred_at)} · {formatDuration(brief.last_contact.duration_seconds)}</p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">No previous call — first touch</p>
          )}
          </div>
        </Surface>

        <Surface variant="inset">
          <div className="p-3">
          <CalendarClock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Callback promise</p>
          {callbackUnavailable ? (
            <p className="mt-1 text-[11px] text-amber-300">Unavailable</p>
          ) : brief.callback ? (
            <p className="mt-1 text-xs font-semibold tabular-nums text-amber-200">{formatDate(brief.callback.scheduled_at)}</p>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">No callback promised</p>
          )}
          </div>
        </Surface>

        <Surface variant="inset">
          <div className="p-3">
          <MessageSquareText className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Latest note</p>
          {noteUnavailable ? (
            <p className="mt-1 text-[11px] text-amber-300">Unavailable</p>
          ) : brief.last_note ? (
            <>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-200">{brief.last_note.body}</p>
              <p className="mt-1 text-[9px] text-zinc-500">{brief.last_note.author_name}</p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">No note yet</p>
          )}
          </div>
        </Surface>

        <Surface variant="inset">
          <div className="p-3">
          <ShoppingBag className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Last order</p>
          {orderUnavailable ? (
            <p className="mt-1 text-[11px] text-amber-300">Unavailable</p>
          ) : brief.last_order ? (
            <>
              <p className="mt-1 text-xs font-semibold tabular-nums text-zinc-100">{brief.last_order.total_amount.toLocaleString("cs-CZ")} {brief.last_order.currency}</p>
              <p className="mt-0.5 text-[10px] capitalize text-zinc-400">{brief.last_order.status}</p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-400">No order yet</p>
          )}
          </div>
        </Surface>
      </div>

      {unavailable.length > 0 && (
        <StatusAlert tone="warning" className="w-full">
          {unavailable.join(" ")}
        </StatusAlert>
      )}
      </div>
    </Surface>
  );
}
