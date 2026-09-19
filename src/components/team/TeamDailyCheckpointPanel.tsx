"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, CalendarClock, CheckCircle2, Clock3, Filter, RotateCcw, ShoppingBag } from "lucide-react";
import type { TeamWorkspaceCheckpoint, TeamWorkspaceSourceState } from "@/lib/dal/teamWorkspace";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { TEAM_WORKSPACE_PERIOD_LABELS, type TeamWorkspacePeriodKey } from "@/lib/teamWorkspaceScope";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSource(value: string): string {
  const labels: Record<string, string> = {
    manual: "Ruční vytvoření",
    previous_call: "Post-call",
    email: "E-mail",
    web_form: "Webový formulář",
    other: "Jiný zdroj",
  };
  return labels[value] || value;
}

function formatOrderStatus(value: string): string {
  const labels: Record<string, string> = {
    completed: "Dokončeno",
    pending: "Čeká",
    in_progress: "Zpracovává se",
    sent: "Odesláno",
    delivered: "Doručeno",
    returned: "Vráceno",
    cancelled: "Anulováno",
  };
  return labels[value] || value;
}

function sourceWarnings(sources: TeamWorkspaceCheckpoint["sources"]): string[] {
  return Object.entries(sources)
    .filter(([key]) => key !== "shifts")
    .flatMap(([, source]) => source.state === "unavailable" ? [source.message] : []);
}

function sourceIsUnavailable(source: TeamWorkspaceSourceState): boolean {
  return source.state === "unavailable";
}

export function TeamDailyCheckpointPanel({ checkpoint, section = "all", periodKey = "today", onSelectOperator }: { checkpoint: TeamWorkspaceCheckpoint; section?: "all" | "orders"; periodKey?: TeamWorkspacePeriodKey; onSelectOperator?: (operatorId: string) => void }) {
  const periodLabel = TEAM_WORKSPACE_PERIOD_LABELS[periodKey] || TEAM_WORKSPACE_PERIOD_LABELS.today;
  const warnings = sourceWarnings(checkpoint.sources);
  const showOrders = section === "all" || section === "orders";
  const showCallbacks = section === "all";
  const showResults = section === "all";
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const isOrdersView = section === "orders";
  const orderOperators = useMemo(
    () => Array.from(new Set(checkpoint.orders.map((order) => order.operatorName))).sort((left, right) => left.localeCompare(right, "cs")),
    [checkpoint.orders],
  );
  const filteredOrders = useMemo(
    () => checkpoint.orders.filter((order) => (
      (sourceFilter === "all" || order.source === sourceFilter)
      && (statusFilter === "all" || order.status === statusFilter)
      && (operatorFilter === "all" || order.operatorName === operatorFilter)
    )),
    [checkpoint.orders, operatorFilter, sourceFilter, statusFilter],
  );
  const visibleOrders = isOrdersView ? filteredOrders : checkpoint.orders;
  const hasOrderFilters = sourceFilter !== "all" || statusFilter !== "all" || operatorFilter !== "all";
  const totalOrders = visibleOrders.length;
  const overdueCallbacks = checkpoint.overdueCallbacks.length;
  const totalSales = checkpoint.operatorMetrics.reduce((total, metric) => total + metric.sales, 0);
  const hasUnavailableMetrics = sourceIsUnavailable(checkpoint.sources.orders) || sourceIsUnavailable(checkpoint.sources.calls);

  return (
    <Surface variant="page">
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-4 w-4 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">{section === "orders" ? "Objednávky" : "Daily Checkpoint"}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {section === "orders" ? "Objednávky vytvořené v zvoleném období v povoleném týmovém rozsahu." : "Týmový přehled objednávek, prošlých callbacků a aktuálních výsledků operátorů v zvoleném období."}
              </p>
            </div>
          </div>
          <StatusBadge tone="neutral">{periodLabel} · Týmová data</StatusBadge>
        </div>

        {isOrdersView && checkpoint.sources.orders.state === "ready" && (
          <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:grid-cols-3" aria-label="Filtry objednávek">
            <label className="text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />Zdroj objednávky</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
                <option value="all">Všechny zdroje</option>
                {Array.from(new Set(checkpoint.orders.map((order) => order.source))).map((source) => <option key={source} value={source}>{formatSource(source)}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Stav objednávky
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
                <option value="all">Všechny stavy</option>
                {Array.from(new Set(checkpoint.orders.map((order) => order.status))).map((status) => <option key={status} value={status}>{formatOrderStatus(status)}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Operátor
              <select value={operatorFilter} onChange={(event) => setOperatorFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
                <option value="all">Všichni operátoři</option>
                {orderOperators.map((operator) => <option key={operator} value={operator}>{operator}</option>)}
              </select>
            </label>
            {hasOrderFilters && (
              <button type="button" onClick={() => { setSourceFilter("all"); setStatusFilter("all"); setOperatorFilter("all"); }} className="inline-flex items-center gap-1.5 text-left text-xs text-zinc-400 hover:text-zinc-100 sm:col-span-3">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Zrušit filtry
              </button>
            )}
          </div>
        )}

        {warnings.length > 0 && (
          <StatusAlert tone="warning" role="status">
            <p className="font-medium">Některé části přehledu nejsou dostupné.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </StatusAlert>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Nové objednávky" value={checkpoint.sources.orders.state === "ready" ? totalOrders : "—"} detail={`Vytvořené v období „${periodLabel.toLowerCase()}“ v týmu`} />
          <MetricCard label="Prošlé callbacky" value={checkpoint.sources.callbacks.state === "ready" ? overdueCallbacks : "—"} valueTone={overdueCallbacks > 0 ? "warning" : "neutral"} detail="Vyžadují kontrolu" />
          <MetricCard label="Aktivní operátoři" value={checkpoint.operatorMetrics.length} detail="V povoleném rozsahu" />
          <MetricCard label="Prodeje" value={checkpoint.sources.calls.state === "ready" ? totalSales : "—"} detail={`Za zvolené období (${periodLabel.toLowerCase()})`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
        {showOrders && <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-labelledby="checkpoint-orders-heading">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-orders-heading" className="text-sm font-semibold text-zinc-100">Nové objednávky</h3>
          </div>
          {checkpoint.sources.orders.state === "unavailable" ? (
            <UnavailableRow message="Objednávky nejsou dostupné. Přehled nevytváří náhradní nuly." />
          ) : visibleOrders.length === 0 ? (
            <EmptyRow message={hasOrderFilters ? "Zvoleným filtrům neodpovídají žádné objednávky." : "V tomto týmovém rozsahu a zvoleném období nejsou žádné nové objednávky."} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full min-w-180 text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Objednávka</th>
                    <th className="px-4 py-3">Operátor</th>
                    <th className="px-4 py-3">Zdroj</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3 text-right">Částka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/70">
                      <td className="px-4 py-3"><Link href={`/orders/${order.id}`} className="font-mono text-zinc-300 hover:text-zinc-100">#{order.id.slice(0, 8)}</Link><span className="mt-1 block text-[10px] text-zinc-600">{formatDate(order.createdAt)}</span></td>
                      <td className="px-4 py-3 text-zinc-300">{order.operatorName}</td>
                      <td className="px-4 py-3 text-zinc-400">{formatSource(order.source)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={order.status === "cancelled" || order.status === "returned" ? "danger" : order.status === "completed" || order.status === "delivered" ? "success" : "neutral"}>{formatOrderStatus(order.status)}</StatusBadge></td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">{order.currency} {order.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>}

        {showCallbacks && <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-labelledby="checkpoint-callbacks-heading">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-callbacks-heading" className="text-sm font-semibold text-zinc-100">Prošlé callbacky</h3>
          </div>
          {checkpoint.sources.callbacks.state === "ready" && (
            <p className="text-[11px] text-zinc-500">
              Prošlé: {checkpoint.overdueCallbacks.length} · Naplánované v období: {checkpoint.upcomingCallbacks.length}
            </p>
          )}
          {checkpoint.sources.callbacks.state === "unavailable" ? (
            <UnavailableRow message="Callbacky nejsou dostupné. Přehled nevytváří náhradní nuly." />
          ) : checkpoint.overdueCallbacks.length === 0 ? (
            <EmptyRow message="V tomto týmovém rozsahu nejsou žádné prošlé callbacky." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {checkpoint.overdueCallbacks.map((callback) => (
                <div key={callback.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><Link href={`/leads/${callback.leadId}`} className="font-medium text-zinc-200 hover:text-zinc-100">{callback.leadName}</Link><p className="mt-1 text-[11px] text-zinc-500">Termín: {formatDate(callback.scheduledAt)}</p></div>
                    <StatusBadge tone="warning">Po termínu</StatusBadge>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">Preferovaný operátor: {callback.operatorName || "Neuveden"}</p>
                </div>
              ))}
            </div>
          )}
        </section>}
        </div>

        {showResults && <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4" aria-labelledby="checkpoint-results-heading">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-results-heading" className="text-sm font-semibold text-zinc-100">Aktuální výsledky</h3>
            {onSelectOperator && <span className="text-[11px] text-zinc-600">řádek rozklikne detail</span>}
          </div>
          {hasUnavailableMetrics && <StatusAlert tone="warning" role="status">Prodeje nebo hovory nejsou úplně dostupné. Čísla se nesmí chápat jako úplný výsledek.</StatusAlert>}
          {checkpoint.operatorMetrics.length === 0 ? (
            <EmptyRow message="V tomto týmovém rozsahu nejsou žádní operátoři s výsledky." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
              <table className="w-full min-w-240 text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr><th className="px-4 py-3">Operátor</th><th className="px-4 py-3 text-right">Prodeje</th><th className="px-4 py-3 text-right">Faily</th><th className="px-4 py-3 text-right">Konverze</th><th className="px-4 py-3 text-right">Talk Time</th><th className="px-4 py-3 text-right">Talk %</th><th className="px-4 py-3 text-right">Vytočeno</th><th className="px-4 py-3 text-right">Spojeno</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {checkpoint.operatorMetrics.map((metric) => (
                    <tr key={metric.operatorId} className={onSelectOperator ? "hover:bg-zinc-900/70" : "hover:bg-zinc-900/70"}>
                      <td className="px-4 py-4 font-medium text-zinc-200">
                        {onSelectOperator ? (
                          <button
                            type="button"
                            onClick={() => onSelectOperator(metric.operatorId)}
                            className="rounded underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100 hover:decoration-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                            aria-label={`Detail operátora ${metric.operatorName}`}
                          >
                            {metric.operatorName}
                          </button>
                        ) : (
                          metric.operatorName
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.sales}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.fails}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.conversionPercent === null ? "—" : `${metric.conversionPercent}%`}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />{formatDuration(metric.talkTimeSeconds)}</span></td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.talkTimePercent === null ? "—" : `${metric.talkTimePercent}%`}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.dialedCalls}</td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-300">{metric.connectedCalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {checkpoint.sources.shifts.state === "unavailable" && <p className="text-[11px] text-zinc-500">Talk Time procento se zobrazí až po zavedení ověřeného plánování směn.</p>}
        </section>}
      </div>
    </Surface>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">{message}</div>;
}

function UnavailableRow({ message }: { message: string }) {
  return <div className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-6 text-center text-xs text-amber-200/80">{message}</div>;
}
