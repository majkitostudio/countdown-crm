import Link from "next/link";
import { ArrowLeft, CalendarClock, CircleAlert, ExternalLink, MapPin, Package, Pencil, ShoppingCart, UserRound } from "lucide-react";
import { getWorkspaceOrder } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { OrderStatusEditor } from "@/components/orders/OrderStatusEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";
import { parseDeliveryAddressSnapshot } from "@/lib/deliveryAddress";
import { CarrierExportDropdown } from "@/components/orders/CarrierExportDropdown";
import { OrderTrackingCard } from "@/components/orders/OrderTrackingCard";
import { ShipmentTimelineCard } from "@/components/orders/ShipmentTimelineCard";
import { updateOrderTrackingAction } from "@/app/actions/crm";
import { formatCurrencyAmount } from "@/lib/currency";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string): string {
  return ({ pending: "Čeká na zpracování", in_progress: "Zpracovává se", sent: "Odesláno", delivered: "Doručeno", returned: "Vráceno", cancelled: "Zrušeno", completed: "Dokončeno" } as Record<string, string>)[status] || status;
}

type OrderLoadResult =
  | { order: Awaited<ReturnType<typeof getWorkspaceOrder>>; canEdit: boolean; canEditDetails: boolean; isManager: boolean }
  | { error: unknown };

async function loadOrder(orderId: string): Promise<OrderLoadResult> {
  try {
    const [context, order] = await Promise.all([
      requireWorkspaceContext(),
      getWorkspaceOrder(orderId),
    ]);
    const canManageOrder = Boolean(order?.can_manage);
    return {
      order,
      canEdit: canManageOrder,
      canEditDetails: Boolean(
        order && canManageOrder && order.items.length > 0 && (
          context.role === "administrator"
          || (context.role === "team_leader" && ["pending", "in_progress"].includes(order.status))
          || (context.role === "operator" && order.agent_id === context.userId && ["pending", "in_progress"].includes(order.status))
        )
      ),
      isManager: canManageOrder && (context.role === "team_leader" || context.role === "administrator"),
    };
  } catch (error) {
    return { error };
  }
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ origin?: string | string[] }>;
}) {
  const { orderId } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedOrigin = Array.isArray(query.origin) ? query.origin[0] : query.origin;
  const backHref = requestedOrigin === "workspace" ? "/console" : "/orders";
  const result = await loadOrder(orderId);

  if ("error" in result) {
    return (
      <Surface variant="empty" className="w-full">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-rose-400" />
        <h1 className="text-base font-semibold text-zinc-100">Objednávka není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-rose-200/80">Objednávku se nepodařilo načíst z aktivního pracovního prostoru. Zkuste to znovu.</p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors duration-150 ease-interface hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět
        </Link>
      </Surface>
    );
  }

  const { order, canEdit, canEditDetails, isManager } = result;

  if (!order) {
    return (
      <Surface variant="empty" className="w-full">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Objednávka nenalezena</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Tato objednávka v aktivním pracovním prostoru neexistuje nebo už není dostupná.</p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors duration-150 ease-interface hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Zpět
        </Link>
      </Surface>
    );
  }

  const minimumOrderTotal = order.items.length > 0
    ? order.items.reduce((sum, item) => sum + item.minimum_unit_price * item.quantity, 0)
    : null;
  const isBelowMinimum = minimumOrderTotal !== null && order.total_amount !== null && order.total_amount < minimumOrderTotal;
  const deliveryAddress = parseDeliveryAddressSnapshot(order.delivery_address_snapshot);

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <PageHeader
        icon={ShoppingCart}
        title="Detail objednávky"
        badge={{ label: statusLabel(order.status), tone: order.status === "completed" || order.status === "delivered" ? "success" : order.status === "pending" ? "warning" : "neutral" }}
        backLink={{ href: backHref, label: requestedOrigin === "workspace" ? "Zpět do konzole operátora" : "Zpět na objednávky" }}
        description={`Objednávka #${order.id} · Vytvořeno ${formatDate(order.created_at)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CarrierExportDropdown orders={[order]} label="Exportovat štítek" variant="secondary" />
            {canEditDetails && (
              <Link
                href={`/orders/${order.id}/edit${requestedOrigin === "workspace" ? "?origin=workspace" : ""}`}
                className={getButtonClassName("secondary")}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Upravit údaje
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
<div className="space-y-6">
          <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Zákazník</h2>
                <p className="mt-1 text-xs text-zinc-500">Záznam leadu propojený s pracovním prostorem.</p>
              </div>
              <UserRound className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-zinc-100">{order.lead_name}</p>
                <p className="mt-1 text-xs text-zinc-500">ID leadu <span className="font-mono text-zinc-400">{order.lead_id || "nedostupné"}</span></p>
              </div>
              {order.lead_id && <Link href={`/leads/${order.lead_id}`} className={getButtonClassName("secondary")}>Otevřít profil zákazníka <ExternalLink className="h-3.5 w-3.5" /></Link>}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Doručovací adresa</h2>
                <p className="mt-1 text-xs text-zinc-500">Adresa uložená u této objednávky.</p>
              </div>
              <MapPin className="h-4 w-4 text-zinc-500" />
            </div>
            {deliveryAddress ? (
              <address className="not-italic text-sm leading-relaxed text-zinc-200">
                <p className="font-medium text-zinc-100">{deliveryAddress.recipient_name}</p>
                <p>{deliveryAddress.line1}</p>
                {deliveryAddress.line2 && <p>{deliveryAddress.line2}</p>}
                <p>{deliveryAddress.postal_code} {deliveryAddress.city}</p>
                <p>{deliveryAddress.country}</p>
              </address>
            ) : (
              <p className="text-xs text-zinc-500">U této objednávky není uložená doručovací adresa.</p>
            )}
          </section>

          <OrderTrackingCard
            orderId={order.id}
            trackingNumber={order.tracking_number || null}
            carrier={order.carrier || null}
            isManager={isManager}
            onUpdateTracking={updateOrderTrackingAction}
          />

          <ShipmentTimelineCard
            orderCreatedAt={order.created_at}
            orderStatus={order.status}
            packageLocation={order.package_location || null}
            trackingNumber={order.tracking_number || null}
            carrier={order.carrier || null}
            events={order.tracking_events || []}
          />

          <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Položky objednávky</h2>
                <p className="mt-1 text-xs text-zinc-500">Uložené údaje o produktech, jednotkových cenách a množství.</p>
              </div>
              <Package className="h-4 w-4 text-zinc-500" />
            </div>
            {order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item) => (
                  <Surface key={item.id} variant="inset" className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">{item.product_title}</p>
                        <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">{formatCurrencyAmount(item.unit_price, item.currency)} za kus · množství {item.quantity}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-zinc-100">{formatCurrencyAmount(item.line_total, item.currency)}</span>
                    </div>
                    {item.unit_price < item.minimum_unit_price && <p className="mt-2 text-[10px] text-amber-300">Pod minimální referenční cenou {formatCurrencyAmount(item.minimum_unit_price, item.currency)} za kus</p>}
                  </Surface>
                ))}
              </div>
            ) : (
              <Surface variant="inset" className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{order.product_title}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">ID produktu {order.product_id || "nedostupné"}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold text-zinc-100">{formatCurrencyAmount(order.total_amount, order.currency)}</span>
                </div>
              </Surface>
            )}
          </section>

          {order.source_note && (
            <Surface variant="page" className="p-6">
              <h2 className="text-sm font-semibold text-zinc-100">Poznámka ke zdroji</h2>
              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs leading-relaxed text-zinc-300">{order.source_note}</p>
            </Surface>
          )}

          <Surface variant="page" className="p-6">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Historie stavů</h2>
                <p className="mt-1 text-xs text-zinc-500">Zaznamenané změny této objednávky.</p>
              </div>
              <CalendarClock className="h-4 w-4 text-zinc-500" />
            </div>
            {order.status_history.length > 0 ? (
              <div className="space-y-3">
                {order.status_history.map((entry) => (
                  <Surface key={entry.id} variant="inset" className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-200">
                        {entry.from_status ? `${statusLabel(entry.from_status)} → ` : "Vytvořeno ve stavu "}{statusLabel(entry.to_status)}
                      </p>
                      <time className="text-[10px] text-zinc-600" dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">{entry.actor_name}</p>
                    {entry.note && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{entry.note}</p>}
                  </Surface>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Pro tuto objednávku není dostupná historie stavů.</p>
            )}
          </Surface>
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-0">
          <OrderStatusEditor orderId={order.id} currentStatus={order.status} canEdit={canEdit} isManager={isManager} />
          {!canEditDetails && order.items.length === 0 && (
            <StatusAlert tone="warning">
              <p className="text-xs font-medium text-amber-100">Údaje historické objednávky jsou pouze pro čtení</p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
                Tato historická objednávka nemá upravitelné údaje položek. Produkt a celková částka výše zůstávají zachovány v historii pouze pro čtení.
              </p>
            </StatusAlert>
          )}
          {!canEditDetails && order.items.length > 0 && order.status !== "pending" && order.status !== "in_progress" && (
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium text-zinc-300">Údaje objednávky jsou pouze pro čtení</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">Po odeslání objednávky může její údaje upravit pouze administrátor. Změny stavu se spravují odděleně.</p>
            </section>
          )}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Shrnutí objednávky</h2>
                <p className="mt-1 text-xs text-zinc-500">Uložené hodnoty pracovního prostoru.</p>
              </div>
              <CalendarClock className="h-4 w-4 text-zinc-500" />
            </div>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Zdroj</dt><dd className="text-right text-zinc-200">{({ manual: "Ruční zadání", previous_call: "Předchozí hovor", email: "E-mail", web_form: "Webový formulář", other: "Jiné" } as Record<string, string>)[order.order_source] || order.order_source}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Operátor</dt><dd className="text-right text-zinc-200">{order.agent_name}</dd></div>
              {minimumOrderTotal !== null && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Minimální referenční součet</dt><dd className="font-mono text-right text-zinc-300">{formatCurrencyAmount(minimumOrderTotal, order.currency)}</dd></div>}
              <div className="flex justify-between gap-4 border-t border-zinc-800/80 pt-3"><dt className="text-zinc-400">Celkem</dt><dd className="font-mono text-base font-semibold text-zinc-100">{formatCurrencyAmount(order.total_amount, order.currency)}</dd></div>
            </dl>
            {isBelowMinimum && <StatusAlert tone="warning">Tato objednávka je pod minimální referenční cenou. Přesto bylo povoleno ji vytvořit.</StatusAlert>}
          </section>
          <Link
            href={backHref}
            className={getButtonClassName("secondary")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {requestedOrigin === "workspace" ? "Zpět do konzole operátora" : "Zpět na objednávky"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
