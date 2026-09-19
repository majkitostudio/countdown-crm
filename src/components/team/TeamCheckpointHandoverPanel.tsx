"use client";

import { ArrowRight, MoonStar } from "lucide-react";
import type { AssistanceRequestDTO } from "@/lib/dal/assistanceRequests";
import type { TeamWorkspaceCallbackSummary, TeamWorkspaceCheckpoint } from "@/lib/dal/teamWorkspace";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

/**
 * Konec směny — read-only předání do další směny (schválená Team Checkpoint předloha).
 * Záměrně bez uzavírací mutace: předání je přehled otevřených položek,
 * řeší se v Callbacky a týmové frontě. Žádný falešný workflow krok.
 */
export function TeamCheckpointHandoverPanel({
  checkpoint,
  openAssistance,
  qualityPendingCount,
  qualityAvailable,
  onOpenQueue,
  onOpenQuality,
}: {
  checkpoint: TeamWorkspaceCheckpoint;
  openAssistance: AssistanceRequestDTO[];
  qualityPendingCount: number;
  qualityAvailable: boolean;
  onOpenQueue: () => void;
  onOpenQuality: () => void;
}) {
  const totalSales = checkpoint.operatorMetrics.reduce((total, metric) => total + metric.sales, 0);
  const totalDialed = checkpoint.operatorMetrics.reduce((total, metric) => total + metric.dialedCalls, 0);
  const totalConnected = checkpoint.operatorMetrics.reduce((total, metric) => total + metric.connectedCalls, 0);
  const handoverCallbacks: TeamWorkspaceCallbackSummary[] = checkpoint.overdueCallbacks.slice(0, 4 - Math.min(4, openAssistance.length));
  const handoverCount = openAssistance.length + handoverCallbacks.length;

  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <MoonStar className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Konec směny — co se přenáší</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Shrnutí dne a otevřené položky pro další směnu. Předání je přehled, ne workflow krok —
                řeší se v Callbacky a týmové frontě.
              </p>
            </div>
          </div>
          <StatusBadge tone={handoverCount > 0 ? "warning" : "neutral"}>
            {handoverCount === 0 ? "bez otevřených položek" : `${handoverCount} ${handoverCount === 1 ? "položka" : handoverCount < 5 ? "položky" : "položek"}`}
          </StatusBadge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Souhrn dne">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Nové objednávky</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{checkpoint.orders.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Prodeje dnes</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{totalSales}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Vytočeno celkem</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{totalDialed}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Spojeno celkem</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{totalConnected}</p>
          </div>
        </div>

        {handoverCount === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
            Klidný den — v tomto týmovém rozsahu nezůstává nic otevřeného k předání.
          </p>
        ) : (
          <ul className="space-y-2">
            {openAssistance.slice(0, 4).map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800/80 px-3 py-2 text-xs">
                <StatusBadge tone={request.requestType === "sos" ? "danger" : "warning"}>
                  {request.requestType === "sos" ? "SOS" : "Pomoc"}
                </StatusBadge>
                <span className="font-medium text-zinc-200">{request.operatorName}</span>
                <span className="truncate text-zinc-500">{request.note || "bez poznámky"}</span>
              </li>
            ))}
            {handoverCallbacks.map((callback) => (
              <li key={callback.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800/80 px-3 py-2 text-xs">
                <StatusBadge tone="warning">Callback</StatusBadge>
                <span className="font-medium text-zinc-200">{callback.operatorName || callback.leadName}</span>
                <span className="truncate text-zinc-500">{callback.leadName} · prošlý callback</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="secondary" onClick={onOpenQueue}>
            Otevřít Callbacky a týmovou frontu <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button variant="quiet" onClick={onOpenQuality}>
            Kvalita hovorů: {qualityAvailable ? `${qualityPendingCount} ke kontrole` : "nedostupná"} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Surface>
  );
}
