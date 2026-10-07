import Link from "next/link";
import { ArrowRight, ExternalLink, Package, ShoppingBag, Truck } from "lucide-react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import { StatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getCarrierMeta, getCarrierTrackingUrl } from "@/lib/tracking";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusTone(status: string): SemanticTone {
  if (status === "completed" || status === "delivered") return "success";
  if (status === "cancelled" || status === "returned") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "Zpracovává se";
  if (status === "sent") return "Odesláno";
  if (status === "delivered") return "Doručeno";
  if (status === "returned") return "Vráceno do skladu";
  if (status === "cancelled") return "Stornováno";
  if (status === "pending") return "Čeká na schválení";
  if (status === "completed") return "Dokončeno";
  return status;
}

export interface LeadOrdersSectionProps {
  orders: WorkspaceOrderDTO[];
  leadId: string;
}

export function LeadOrdersSection({ orders, leadId }: LeadOrdersSectionProps) {
  void leadId;

  return (
    <Surface variant="page" data-testid="lead-orders-section">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Historie objednávek & Sledování zásilek</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Přehled nákupů zákazníka, stav expedice a sledovací čísla balíků.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
              {orders.length}
            </span>
            <ShoppingBag className="h-4 w-4 text-zinc-500" />
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <Package className="mx-auto h-6 w-6 text-zinc-600" />
            <p className="mt-2 text-xs font-medium text-zinc-300">Zákazník zatím nemá žádné objednávky</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Jakmile operátor vytvoří objednávku v hovoru, zobrazí se zde její stav a sledování balíku.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const trackingUrl = getCarrierTrackingUrl(order.carrier, order.tracking_number);
              const carrierMeta = getCarrierMeta(order.carrier);

              return (
                <Surface
                  key={order.id}
                  variant="inset"
                  className="p-4 transition-colors hover:border-zinc-700/80"
                  data-testid={`lead-order-card-${order.id}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/orders/${order.id}?origin=lead`}
                          className="font-mono text-xs font-semibold text-zinc-200 transition-colors hover:text-white"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                        <StatusBadge tone={getStatusTone(order.status)}>
                          {statusLabel(order.status)}
                        </StatusBadge>
                        <span className="text-[11px] text-zinc-500">
                          {formatDate(order.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="font-medium text-zinc-300">{order.product_title}</span>
                        <span className="font-mono font-semibold text-zinc-100">
                          {order.currency} {order.total_amount.toFixed(2)}
                        </span>
                        {order.agent_name && (
                          <span className="text-[11px] text-zinc-500">
                            Operátor: {order.agent_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/orders/${order.id}?origin=lead`}
                        aria-label={`Otevřít objednávku ${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                      >
                        <span>Detail objednávky</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Sledování zásilky (Tracking) */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      {order.tracking_number ? (
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                            {carrierMeta.badge}
                          </span>
                          <span className="font-mono text-xs text-zinc-200 truncate">
                            {order.tracking_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          {order.status === "sent" ? "Číslo zásilky nebylo zadáno" : "Zatím neodesláno"}
                        </span>
                      )}
                    </div>

                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        data-testid={`lead-order-tracking-link-${order.id}`}
                      >
                        <span>Sledovat balíček</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </div>
    </Surface>
  );
}
