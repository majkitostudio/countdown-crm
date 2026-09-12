import { BookOpenCheck, TriangleAlert } from "lucide-react";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import type { ConversationBriefDTO } from "@/lib/dal/conversationBrief";

interface ConversationBriefCardProps {
  brief: ConversationBriefDTO | null;
  isLoading: boolean;
  error: string | null;
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
      <Surface variant="page" aria-busy="true" data-testid="conversation-brief-compact">
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Call context</p>
          <p className="mt-1 text-xs text-zinc-500">Loading recorded context…</p>
        </div>
      </Surface>
    );
  }

  if (error || !brief) {
    return (
      <StatusAlert tone="neutral" data-testid="conversation-brief-compact">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">Call context unavailable</p>
            <p className="mt-1 text-xs text-zinc-400">{error || "Recorded customer context could not be loaded."}</p>
          </div>
        </div>
      </StatusAlert>
    );
  }

  const unavailable = unavailableMessages(brief);

  return (
    <Surface
      variant="inset"
      aria-labelledby="conversation-brief-title"
      data-testid="conversation-brief-compact"
    >
      <section className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Call context</p>
            <h2 id="conversation-brief-title" className="mt-1 truncate text-[13px] font-semibold tracking-tight text-white">
              {brief.lead.problem || "No recorded customer need"}
            </h2>
          </div>
          <StatusBadge tone="neutral">Recorded facts</StatusBadge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Why this lead</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{brief.queue_reason || "Routing reason not recorded"}</p>
          </div>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2.5">
            <div className="flex items-start gap-2">
              <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Safe next step</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-200">{brief.next_safe_step.label}</p>
              </div>
            </div>
          </div>
        </div>

        {unavailable.length > 0 && (
          <StatusAlert tone="neutral" className="mt-2 w-full text-xs">
            {unavailable.join(" ")}
          </StatusAlert>
        )}
      </section>
    </Surface>
  );
}
