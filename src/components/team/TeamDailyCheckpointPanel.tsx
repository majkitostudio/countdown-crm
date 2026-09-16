"use client";

import Link from "next/link";
import { BarChart3, CalendarClock, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import type { TeamWorkspaceCheckpoint, TeamWorkspaceSourceState } from "@/lib/dal/teamWorkspace";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
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

function formatSource(value: string): string {
  const labels: Record<string, string> = {
    manual: "Manual Creation",
    previous_call: "Post-call",
    email: "Email",
    web_form: "Web form",
    other: "Other",
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

export function TeamDailyCheckpointPanel({ checkpoint, section = "all" }: { checkpoint: TeamWorkspaceCheckpoint; section?: "all" | "orders" }) {
  const warnings = sourceWarnings(checkpoint.sources);
  const showOrders = section === "all" || section === "orders";
  const showCallbacks = section === "all";
  const showResults = section === "all";
  const totalOrders = checkpoint.orders.length;
  const overdueCallbacks = checkpoint.overdueCallbacks.length;
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
                {section === "orders" ? "Objednávky vytvořené dnes v povoleném týmovém rozsahu." : "Týmový přehled dnešních objednávek, prošlých callbacků a aktuálních výsledků operátorů."}
              </p>
            </div>
          </div>
          <StatusBadge tone="neutral">Dnes · Týmová data</StatusBadge>
        </div>

        {warnings.length > 0 && (
          <StatusAlert tone="warning" role="status">
            <p className="font-medium">Některé části přehledu nejsou dostupné.</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </StatusAlert>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Nové objednávky" value={checkpoint.sources.orders.state === "ready" ? totalOrders : "—"} detail="Objednávky vytvořené dnes v týmu" />
          <MetricCard label="Prošlé callbacky" value={checkpoint.sources.callbacks.state === "ready" ? overdueCallbacks : "—"} valueTone={overdueCallbacks > 0 ? "warning" : "neutral"} detail="Callbacky po termínu" />
          <MetricCard label="Operátoři ve výsledcích" value={checkpoint.operatorMetrics.length} detail="Operátoři v povoleném rozsahu" />
        </div>

        {showOrders && <section className="space-y-3" aria-labelledby="checkpoint-orders-heading">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-orders-heading" className="text-sm font-semibold text-zinc-100">Nové objednávky</h3>
          </div>
          {checkpoint.sources.orders.state === "unavailable" ? (
            <UnavailableRow message="Objednávky nejsou dostupné. Přehled nevytváří náhradní nuly." />
          ) : checkpoint.orders.length === 0 ? (
            <EmptyRow message="Dnes nejsou v tomto týmovém rozsahu žádné nové objednávky." />
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
                  {checkpoint.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/70">
                      <td className="px-4 py-3"><Link href={`/orders/${order.id}`} className="font-mono text-zinc-300 hover:text-zinc-100">#{order.id.slice(0, 8)}</Link><span className="mt-1 block text-[10px] text-zinc-600">{formatDate(order.createdAt)}</span></td>
                      <td className="px-4 py-3 text-zinc-300">{order.operatorName}</td>
                      <td className="px-4 py-3 text-zinc-400">{formatSource(order.source)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={order.status === "cancelled" || order.status === "returned" ? "danger" : order.status === "completed" || order.status === "delivered" ? "success" : "neutral"}>{order.status}</StatusBadge></td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">{order.currency} {order.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>}

        {showCallbacks && <section className="space-y-3" aria-labelledby="checkpoint-callbacks-heading">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-callbacks-heading" className="text-sm font-semibold text-zinc-100">Prošlé callbacky</h3>
          </div>
          {checkpoint.sources.callbacks.state === "unavailable" ? (
            <UnavailableRow message="Callbacky nejsou dostupné. Přehled nevytváří náhradní nuly." />
          ) : checkpoint.overdueCallbacks.length === 0 ? (
            <EmptyRow message="V tomto týmovém rozsahu nejsou žádné prošlé callbacky." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {checkpoint.overdueCallbacks.map((callback) => (
                <div key={callback.id} className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-4">
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

        {showResults && <section className="space-y-3" aria-labelledby="checkpoint-results-heading">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 id="checkpoint-results-heading" className="text-sm font-semibold text-zinc-100">Aktuální výsledky</h3>
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
                    <tr key={metric.operatorId} className="hover:bg-zinc-900/70">
                      <td className="px-4 py-4 font-medium text-zinc-200">{metric.operatorName}</td>
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
