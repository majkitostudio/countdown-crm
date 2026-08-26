import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, RefreshCw } from "lucide-react";
import { getTrainingSessionReviews } from "@/lib/dal/trainingSessions";
import { isDataAccessError } from "@/lib/dal/errors";
import { PageHeader } from "@/components/layout/PageHeader";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default async function TrainingReviewsPage() {
  let sessions: Awaited<ReturnType<typeof getTrainingSessionReviews>> = [];
  let loadError: unknown = null;

  try {
    sessions = await getTrainingSessionReviews();
  } catch (error: unknown) {
    loadError = error;
  }

  if (loadError) {
    const message = isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
      ? "This review area is available to Team Leaders and Administrators only."
      : "Training reviews could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Teamleader Review unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
        <Link href="/training" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">
          <RefreshCw className="h-3.5 w-3.5" />
          Return to AI Training
        </Link>
      </div>
    );
  }

  return (
      <div className="mx-auto max-w-screen-2xl space-y-8">
        <PageHeader
          icon={ClipboardList}
          title="Teamleader Review"
          badge={{ label: "Training only", tone: "neutral" }}
          description="Review completed AI training sessions without opening production call records."
          actions={<span className="text-xs font-mono text-zinc-500">{sessions.length} session{sessions.length === 1 ? "" : "s"}</span>}
        />

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-16 text-center">
            <ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-200">No training sessions yet</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Completed training sessions will appear here for Team Leader and Administrator review.</p>
            <Link href="/training" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200">
              Open AI Training
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
            <div className="border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Recent training sessions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Operator</th>
                    <th className="px-5 py-3">Scenario</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">Turns</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {sessions.map((session) => {
                    const scorecard = session.scorecard && typeof session.scorecard === "object" && !Array.isArray(session.scorecard)
                      ? session.scorecard as { overallScore?: number; complianceScore?: number }
                      : {};
                    return (
                      <tr key={session.id} className="transition-colors hover:bg-zinc-900/80">
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-zinc-400">{formatDate(session.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-200">{session.operator_name}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">{session.operator_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-200">{session.scenario_title}</div>
                          <div className="mt-0.5 text-[11px] text-zinc-500">{session.target_product}</div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-zinc-300">{formatDuration(session.duration_seconds)}</td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-zinc-300">
                          <span>{typeof scorecard.overallScore === "number" ? `${scorecard.overallScore}%` : "—"}</span>
                          <span className="ml-2 text-[10px] text-zinc-500">{typeof scorecard.complianceScore === "number" ? `${scorecard.complianceScore}% compliance` : ""}</span>
                        </td>
                        <td className="px-5 py-4 font-mono text-zinc-300">{session.turn_count}</td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/training/reviews/${session.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">
                            Open review
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
  );
}
