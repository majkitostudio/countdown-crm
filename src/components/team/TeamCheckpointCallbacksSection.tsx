"use client";

import { CalendarClock, ArrowRight } from "lucide-react";
import type { TeamWorkspaceCheckpoint } from "@/lib/dal/teamWorkspace";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TeamCheckpointCallbacksSection({
  checkpoint,
  onOpenQueue,
}: { checkpoint: TeamWorkspaceCheckpoint; onOpenQueue: () => void }) {
  const overdueCount = checkpoint.overdueCallbacks.length;
  const upcomingCount = checkpoint.upcomingCallbacks.length;

  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Callbacky</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Prošlé: {overdueCount} · Naplánované v období: {upcomingCount}
              </p>
            </div>
          </div>
          <StatusBadge tone={overdueCount > 0 ? "warning" : "neutral"}>
            {overdueCount > 0 ? `${overdueCount} prošlých` : "bez prošlých"}
          </StatusBadge>
        </div>

        {checkpoint.sources.callbacks.state === "unavailable" ? (
          <p className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-4 text-center text-xs text-amber-200/80">
            Callbacky nejsou dostupné. Přehled nevytváří náhradní nuly.
          </p>
        ) : overdueCount === 0 && upcomingCount === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
            V tomto týmovém rozsahu a zvoleném období nejsou žádné callbacky.
          </p>
        ) : (
          <div className="space-y-3">
            {checkpoint.overdueCallbacks.length > 0 && (
              <section className="space-y-2" aria-label="Prošlé callbacky">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prošlé callbacky</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {checkpoint.overdueCallbacks.map((callback) => (
                    <div key={callback.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-200">{callback.leadName}</span>
                          <p className="mt-1 text-[11px] text-zinc-500">Termín: {formatDate(callback.scheduledAt)}</p>
                        </div>
                        <StatusBadge tone="warning">Po termínu</StatusBadge>
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-500">Preferovaný operátor: {callback.operatorName || "Neuveden"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {checkpoint.upcomingCallbacks.length > 0 && (
              <section className="space-y-2" aria-label="Naplánované callbacky">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Naplánované v období</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {checkpoint.upcomingCallbacks.map((callback) => (
                    <div key={callback.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-200">{callback.leadName}</span>
                          <p className="mt-1 text-[11px] text-zinc-500">Termín: {formatDate(callback.scheduledAt)}</p>
                        </div>
                        <StatusBadge tone="info">Naplánovaný</StatusBadge>
                      </div>
                      <p className="mt-3 text-[11px] text-zinc-500">Preferovaný operátor: {callback.operatorName || "Neuveden"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="secondary" onClick={onOpenQueue}>
            Otevřít Callbacky a týmovou frontu <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Surface>
  );
}