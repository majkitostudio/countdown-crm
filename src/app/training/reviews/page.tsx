import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, RefreshCw } from "lucide-react";
import { getTrainingSessionReviews } from "@/lib/dal/trainingSessions";
import { isDataAccessError } from "@/lib/dal/errors";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";

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
      : "Kontroly tréninků se nepodařilo načíst. Náhradní data nezobrazujeme.";

    return (
      <div className="mx-auto max-w-2xl">
      <Surface variant="empty">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Kontrola tréninků není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
        <Link
          href="/training"
          className={getButtonClassName("secondary")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Return to AI Training
        </Link>
      </Surface>
      </div>
    );
  }

  return (
      <div className="mx-auto max-w-screen-2xl space-y-8">
        <PageHeader
          icon={ClipboardList}
          title="Kontrola tréninků"
          badge={{ label: "Training only", tone: "neutral" }}
          description="Kontrola dokončených tréninků oddělená od ostrých hovorů."
          actions={<span className="text-xs font-mono text-zinc-500">{sessions.length} {sessions.length === 1 ? "relace" : "relací"}</span>}
        />

        {sessions.length === 0 ? (
          <Surface variant="empty">
            <ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-200">Zatím žádné tréninky</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Dokončené tréninky se zde zobrazí pro kontrolu Team Leaderem nebo administrátorem.</p>
            <Link
              href="/training"
              className={getButtonClassName("primary")}
            >
              Otevřít AI trénink
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Surface>
        ) : (
          <Surface variant="table">
            <div className="border-b border-zinc-800 px-6 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Poslední tréninky</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">Datum</th>
                    <th className="px-5 py-3">Operátor</th>
                    <th className="px-5 py-3">Scénář</th>
                    <th className="px-5 py-3">Délka</th>
                    <th className="px-5 py-3">Opravy</th>
                    <th className="px-5 py-3">Tahů</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {sessions.map((session) => {
                    const feedback = Array.isArray(session.feedback) ? session.feedback : [];
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
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-zinc-300">{feedback.length}</td>
                        <td className="px-5 py-4 font-mono text-zinc-300">{session.turn_count}</td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/training/reviews/${session.id}`}
                            className={getButtonClassName("secondary")}
                          >
                            Otevřít kontrolu
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        )}
      </div>
  );
}
