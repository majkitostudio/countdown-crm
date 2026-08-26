import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, LockKeyhole, MessageSquare, ShieldCheck } from "lucide-react";
import { getTrainingSessionReview } from "@/lib/dal/trainingSessions";
import { isDataAccessError } from "@/lib/dal/errors";
import { PageHeader } from "@/components/layout/PageHeader";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default async function TrainingReviewDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  let session: Awaited<ReturnType<typeof getTrainingSessionReview>> = null;
  let loadError: unknown = null;

  try {
    session = await getTrainingSessionReview(sessionId);
  } catch (error: unknown) {
    loadError = error;
  }

  if (loadError) {
    const message = isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
      ? "This review is available to Team Leaders and Administrators only."
      : "This training review could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Review unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
        <Link href="/training/reviews" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to reviews
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
        <h1 className="text-base font-semibold text-zinc-100">Training session not found</h1>
        <p className="mt-2 text-xs text-zinc-500">The session does not exist in the current workspace or is no longer available.</p>
        <Link href="/training/reviews" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to reviews
        </Link>
      </div>
    );
  }

  const scorecard = session.scorecard && typeof session.scorecard === "object" && !Array.isArray(session.scorecard)
    ? session.scorecard as { grade?: string; overallScore?: number; complianceScore?: number; summaryFeedback?: string }
    : {};

  return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Training Review"
          badge={{ label: "Read-only", tone: "neutral" }}
          backLink={{ href: "/training/reviews", label: "Back to Teamleader Review" }}
          description={<>{session.scenario_title} · {session.target_product}</>}
          actions={
            <div className="text-left text-xs md:text-right">
              <div className="font-medium text-zinc-200">{session.operator_name}</div>
              <div className="mt-1 text-[11px] text-zinc-500">{formatDate(session.created_at)}</div>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Duration", formatDuration(session.duration_seconds)],
            ["Turns", String(session.turn_count)],
            ["Score", typeof scorecard.overallScore === "number" ? `${scorecard.overallScore}%` : "—"],
            ["Compliance", typeof scorecard.complianceScore === "number" ? `${scorecard.complianceScore}%` : "—"],
            ["AI source", session.ai_source || "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
              <span className="mt-1 block truncate font-mono text-sm text-zinc-200">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Transcript timeline</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Training simulation · No production call</span>
          </div>

          {session.turns.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-xs text-zinc-500">This session has no transcript turns.</div>
          ) : (
            <div className="space-y-4">
              {session.turns.map((turn) => {
                const isOperator = turn.speaker === "operator";
                return (
                  <div key={turn.id} className={`flex gap-3 ${isOperator ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isOperator ? "border-zinc-700 bg-zinc-800 text-zinc-200" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}>
                      {isOperator ? <CheckCircle2 className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[82%] rounded-xl border p-3 ${isOperator ? "border-zinc-700 bg-zinc-100 text-zinc-950" : "border-zinc-800 bg-zinc-950 text-zinc-200"}`}>
                      <div className={`mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider ${isOperator ? "text-zinc-500" : "text-zinc-500"}`}>
                        <span>{isOperator ? "Operator" : "Customer"}</span>
                        <span>·</span>
                        <span>{formatDate(turn.occurred_at)}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{turn.text}</p>
                      <div className={`mt-2 flex gap-2 text-[10px] font-mono ${isOperator ? "text-zinc-500" : "text-zinc-500"}`}>
                        <span>{turn.source.replace("_", " ")}</span>
                        {typeof turn.confidence === "number" && <span>· confidence {Math.round(turn.confidence * 100)}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300"><ShieldCheck className="h-4 w-4 text-zinc-400" /> Score summary</h2>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">{scorecard.summaryFeedback || "No summary feedback was stored for this session."}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300"><LockKeyhole className="h-4 w-4 text-zinc-400" /> Access boundary</h2>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">This review is visible only to Team Leaders and Administrators who are members of the same workspace.</p>
          </div>
        </div>
      </div>
  );
}
