"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, HandHelping, ShoppingBag } from "lucide-react";
import type { AssistanceRequestDTO } from "@/lib/dal/assistanceRequests";
import type { CallQualityReviewDTO } from "@/lib/dal/callQualityReviews";
import type { TeamWorkspaceCallbackSummary, TeamWorkspaceOrderSummary } from "@/lib/dal/teamWorkspace";
import type { TeamWorkspaceOperatorMetrics } from "@/lib/teamWorkspaceMetrics";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export interface TeamOperatorDetailData {
  metric: TeamWorkspaceOperatorMetrics;
  orders: TeamWorkspaceOrderSummary[];
  overdueCallbacks: TeamWorkspaceCallbackSummary[];
  assistanceRequests: AssistanceRequestDTO[];
  qualityReviews: CallQualityReviewDTO[];
  qualityAvailable: boolean;
}

/**
 * Detail operátora v rámci Daily Checkpointu (schválená Team Checkpoint předloha).
 * Záměrně ukazuje pouze data, která už má checkpoint read model: agregované
 * metriky, dnešní objednávky, prošlé callbacky, žádosti o asistenci a AI kontrolu.
 * Historie jednotlivých hovorů operátora zatím není součástí read modelu —
 * nevymýšlí se, viz follow-up v AKTUALNI_STAV_A_DESATERO.
 */
export function TeamOperatorDetailPanel({
  detail,
  onBack,
  onOpenQuality,
}: {
  detail: TeamOperatorDetailData;
  onBack: () => void;
  onOpenQuality: () => void;
}) {
  const { metric, orders, overdueCallbacks, assistanceRequests, qualityReviews, qualityAvailable } = detail;
  const needsReview = qualityReviews.filter((review) => review.status === "review" || review.status === "pending").length;

  return (
    <Surface variant="page">
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button variant="quiet" onClick={onBack}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Zpět na checkpoint
            </Button>
            <h2 className="mt-2 text-sm font-semibold text-zinc-100">{metric.operatorName}</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Detail operátora v zvoleném období a povoleném týmovém rozsahu.
            </p>
          </div>
          <StatusBadge tone="neutral">Týmová data</StatusBadge>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Souhrn dne operátora">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Prodeje</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{metric.sales}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Faily</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{metric.fails}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Vytočeno / Spojeno</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{metric.dialedCalls} / {metric.connectedCalls}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs font-medium text-zinc-500">Talk Time</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{formatDuration(metric.talkTimeSeconds)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Konverze {metric.conversionPercent === null ? "—" : `${metric.conversionPercent}%`} · Talk % {metric.talkTimePercent === null ? "—" : `${metric.talkTimePercent}%`}
            </p>
          </div>
        </section>
        <p className="text-[11px] text-zinc-500">Konverze a Talk % se zavedou se směnami.</p>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-label="Objednávky operátora">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-zinc-100">Objednávky operátora</h3>
              <StatusBadge tone="neutral">{orders.length}</StatusBadge>
            </div>
            {orders.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
                V zvoleném období nemá operátor žádné objednávky.
              </p>
            ) : (
              <ul className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2 text-xs">
                    <Link href={`/orders/${order.id}`} className="font-mono text-zinc-300 hover:text-zinc-100">#{order.id.slice(0, 8)}</Link>
                    <span className="text-zinc-500">{formatDate(order.createdAt)}</span>
                    <span className="font-mono text-zinc-300">{order.currency} {order.totalAmount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-label="Prošlé callbacky operátora">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-zinc-100">Prošlé callbacky</h3>
              <StatusBadge tone={overdueCallbacks.length > 0 ? "warning" : "neutral"}>{overdueCallbacks.length}</StatusBadge>
            </div>
            {overdueCallbacks.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
                Operátor nemá žádné prošlé callbacky.
              </p>
            ) : (
              <ul className="space-y-2">
                {overdueCallbacks.slice(0, 5).map((callback) => (
                  <li key={callback.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2 text-xs">
                    <Link href={`/leads/${callback.leadId}`} className="font-medium text-zinc-200 hover:text-zinc-100">{callback.leadName}</Link>
                    <span className="text-zinc-500">Termín: {formatDate(callback.scheduledAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-label="Žádosti operátora o pomoc">
            <div className="flex items-center gap-2">
              <HandHelping className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-zinc-100">Žádosti o pomoc</h3>
              <StatusBadge tone="neutral">{assistanceRequests.length}</StatusBadge>
            </div>
            {assistanceRequests.length === 0 ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
                Operátor dnes nežádal o pomoc.
              </p>
            ) : (
              <ul className="space-y-2">
                {assistanceRequests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-zinc-800/80 px-3 py-2 text-xs">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={request.requestType === "sos" ? "danger" : "warning"}>
                        {request.requestType === "sos" ? "SOS" : "Request Help"}
                      </StatusBadge>
                      <StatusBadge tone="neutral">
                        {request.status === "claimed" ? "Převzato" : request.status === "open" ? "Čeká na pomoc" : request.status}
                      </StatusBadge>
                    </span>
                    {request.note && <span className="mt-2 block leading-relaxed text-zinc-300">„{request.note}“</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-label="Kvalita hovorů operátora">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">Kvalita hovorů</h3>
              <StatusBadge tone={needsReview > 0 ? "warning" : "neutral"}>
                {qualityAvailable ? `${needsReview} ke kontrole` : "nedostupné"}
              </StatusBadge>
            </div>
            {!qualityAvailable ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
                AI kontrola kvality není dostupná.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-zinc-500">
                  Operátor má {qualityReviews.length} {qualityReviews.length === 1 ? "záznam" : qualityReviews.length < 5 ? "záznamy" : "záznamů"} AI kontroly,
                  z toho {needsReview} ke kontrole. Přehrávání a hodnocení je v Kontrole kvality hovorů.
                </p>
                <Button variant="secondary" onClick={onOpenQuality}>
                  Zobrazit kvalitu hovorů tohoto operátora
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </Surface>
  );
}
