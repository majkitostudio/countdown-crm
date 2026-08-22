import Link from "next/link";
import { ArrowLeft, CalendarClock, CircleAlert, ExternalLink, Package, Pencil, ShoppingCart, UserRound } from "lucide-react";
import { getWorkspaceOrder } from "@/lib/dal/activity";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { OrderStatusEditor } from "@/components/orders/OrderStatusEditor";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: string): string {
  if (status === "completed") return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";
  if (status === "delivered") return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";
  if (status === "sent") return "border-sky-900/60 bg-sky-950/30 text-sky-300";
  if (status === "in_progress") return "border-blue-900/60 bg-blue-950/30 text-blue-300";
  if (status === "pending") return "border-amber-900/60 bg-amber-950/30 text-amber-300";
  if (status === "returned" || status === "cancelled") return "border-rose-900/60 bg-rose-950/30 text-rose-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In-Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
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
    return {
      order,
      canEdit: context.role === "operator" || context.role === "team_leader" || context.role === "administrator",
      canEditDetails: Boolean(
        order && order.items.length > 0 && (
          context.role === "administrator"
          || (context.role === "team_leader" && ["pending", "in_progress"].includes(order.status))
          || (context.role === "operator" && order.agent_id === context.userId && ["pending", "in_progress"].includes(order.status))
        )
      ),
      isManager: context.role === "team_leader" || context.role === "administrator",
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
  const backHref = requestedOrigin === "workspace" ? "/workspace" : "/orders";
  const result = await loadOrder(orderId);

  if ("error" in result) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-900/50 bg-rose-950/20 p-12 text-center">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-rose-400" />
        <h1 className="text-base font-semibold text-zinc-100">Order unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-rose-200/80">The order could not be loaded from the active workspace.</p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>
    );
  }

  const { order, canEdit, canEditDetails, isManager } = result;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <CircleAlert className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Order not found</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">This order does not exist in the active workspace or is no longer available.</p>
        <Link href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>
    );
  }

  const minimumOrderTotal = order.items.length > 0
    ? order.items.reduce((sum, item) => sum + item.minimum_unit_price * item.quantity, 0)
    : null;
  const isBelowMinimum = minimumOrderTotal !== null && order.total_amount < minimumOrderTotal;

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link href={backHref} className="mt-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              <Link href="/orders" className="hover:text-zinc-300">Orders</Link>
              <span>/</span>
              <span>#{order.id}</span>
            </div>
            <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-zinc-100">
              <ShoppingCart className="h-5 w-5 text-zinc-400" />
              Order detail
            </h1>
            <p className="mt-1 text-xs text-zinc-400">Created {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditDetails && (
            <Link
              href={`/orders/${order.id}/edit${requestedOrigin === "workspace" ? "?origin=workspace" : ""}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit details
            </Link>
          )}
          <span className={`w-fit rounded-md border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Customer</h2>
                <p className="mt-1 text-xs text-zinc-500">Workspace-linked lead record.</p>
              </div>
              <UserRound className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-zinc-100">{order.lead_name}</p>
                <p className="mt-1 text-xs text-zinc-500">Lead ID <span className="font-mono text-zinc-400">{order.lead_id || "unavailable"}</span></p>
              </div>
              {order.lead_id && <Link href={`/workspace?leadId=${order.lead_id}`} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100">Open in Console <ExternalLink className="h-3.5 w-3.5" /></Link>}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Order item</h2>
                <p className="mt-1 text-xs text-zinc-500">Persisted product snapshots, unit prices and quantities.</p>
              </div>
              <Package className="h-4 w-4 text-zinc-500" />
            </div>
            {order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">{item.product_title}</p>
                        <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">{item.currency} {item.unit_price.toFixed(2)} each · quantity {item.quantity}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-zinc-100">{item.currency} {item.line_total.toFixed(2)}</span>
                    </div>
                    {item.unit_price < item.minimum_unit_price && <p className="mt-2 text-[10px] text-amber-300">Below minimum reference price of {item.currency} {item.minimum_unit_price.toFixed(2)} per piece</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{order.product_title}</p>
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">Product ID {order.product_id || "unavailable"}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-zinc-100">{order.currency} {order.total_amount.toFixed(2)}</span>
              </div>
            )}
          </section>

          {order.source_note && (
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-100">Source note</h2>
              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs leading-relaxed text-zinc-300">{order.source_note}</p>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Status history</h2>
                <p className="mt-1 text-xs text-zinc-500">Recorded changes for this order.</p>
              </div>
              <CalendarClock className="h-4 w-4 text-zinc-500" />
            </div>
            {order.status_history.length > 0 ? (
              <div className="space-y-3">
                {order.status_history.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-200">
                        {entry.from_status ? `${statusLabel(entry.from_status)} → ` : "Created as "}{statusLabel(entry.to_status)}
                      </p>
                      <time className="text-[10px] text-zinc-600" dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">{entry.actor_name}</p>
                    {entry.note && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{entry.note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No status history is available for this order.</p>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-0">
          <OrderStatusEditor orderId={order.id} currentStatus={order.status} canEdit={canEdit} isManager={isManager} />
          {!canEditDetails && order.items.length === 0 && (
            <section className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5">
              <p className="text-xs font-medium text-amber-100">Legacy order details are read-only</p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
                This historical order has no editable item snapshot. Its product and total above are preserved as read-only order history.
              </p>
            </section>
          )}
          {!canEditDetails && order.items.length > 0 && order.status !== "pending" && order.status !== "in_progress" && (
            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium text-zinc-300">Order details are read-only</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">After the order is sent, only an administrator can edit its details. Status changes remain a separate workflow.</p>
            </section>
          )}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Order summary</h2>
                <p className="mt-1 text-xs text-zinc-500">Persisted workspace values.</p>
              </div>
              <CalendarClock className="h-4 w-4 text-zinc-500" />
            </div>
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Source</dt><dd className="text-right capitalize text-zinc-200">{order.order_source.replaceAll("_", " ")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-zinc-500">Operator</dt><dd className="text-right text-zinc-200">{order.agent_name}</dd></div>
              {minimumOrderTotal !== null && <div className="flex justify-between gap-4"><dt className="text-zinc-500">Minimum reference total</dt><dd className="font-mono text-right text-zinc-300">{order.currency} {minimumOrderTotal.toFixed(2)}</dd></div>}
              <div className="flex justify-between gap-4 border-t border-zinc-800/80 pt-3"><dt className="text-zinc-400">Total</dt><dd className="font-mono text-base font-semibold text-zinc-100">{order.currency} {order.total_amount.toFixed(2)}</dd></div>
            </dl>
            {isBelowMinimum && <div className="mt-5 rounded-xl border border-amber-800/70 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-200">This order is below the minimum reference price. It was still allowed to be created.</div>}
          </section>
          <Link href={backHref} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100">
            <ArrowLeft className="h-3.5 w-3.5" />
            {requestedOrigin === "workspace" ? "Back to Operator Console" : "Back to Orders"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
