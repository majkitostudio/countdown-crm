"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Package,
  PackageCheck,
  PackageX,
  PhoneCall,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

// --- helpers ---

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(0)}`;
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "short" }).format(
    new Date(dateStr)
  );
}

// --- column definitions ---

type ColumnId =
  | "pending"
  | "in_progress"
  | "sent"
  | "delivered"
  | "returned"
  | "cancelled";

interface KanbanColumn {
  id: ColumnId;
  label: string;
  icon: React.ElementType;
  accentClass: string;    // header colour
  countTone: "neutral" | "warning" | "success" | "danger";
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "pending",
    label: "Čeká na zpracování",
    icon: Clock,
    accentClass: "border-amber-500/40 bg-amber-500/5",
    countTone: "warning",
  },
  {
    id: "in_progress",
    label: "Expedice / V přípravě",
    icon: Package,
    accentClass: "border-sky-500/40 bg-sky-500/5",
    countTone: "neutral",
  },
  {
    id: "sent",
    label: "Odesláno",
    icon: Truck,
    accentClass: "border-indigo-500/40 bg-indigo-500/5",
    countTone: "neutral",
  },
  {
    id: "delivered",
    label: "Doručeno / Převzato",
    icon: PackageCheck,
    accentClass: "border-emerald-500/40 bg-emerald-500/5",
    countTone: "success",
  },
  {
    id: "returned",
    label: "Vráceno / Re-ship",
    icon: RotateCcw,
    accentClass: "border-rose-500/40 bg-rose-500/5",
    countTone: "danger",
  },
  {
    id: "cancelled",
    label: "Zrušeno",
    icon: PackageX,
    accentClass: "border-zinc-600/40 bg-zinc-600/5",
    countTone: "neutral",
  },
];

// --- card component ---

function OrderCard({
  order,
}: {
  order: WorkspaceOrderDTO;
}) {
  // Alert logic: package on pickup point for 3+ days and not yet called
  const daysOnPickup =
    order.status === "sent" && order.package_location
      ? daysSince(order.package_arrived_at)
      : null;

  const isPickupAlert =
    daysOnPickup !== null &&
    daysOnPickup >= 3 &&
    !order.pickup_call_completed_at;

  // Days since delivered (for P3 retence countdown)
  const daysSinceDelivered =
    order.status === "delivered" ? daysSince(order.delivered_at) : null;
  const daysUntilRetence =
    daysSinceDelivered !== null ? Math.max(0, 21 - daysSinceDelivered) : null;

  return (
    <article
      className={`group relative rounded-xl border bg-zinc-900 p-3.5 transition-shadow hover:shadow-lg ${
        isPickupAlert
          ? "border-rose-500/60 ring-1 ring-rose-500/20"
          : "border-zinc-800"
      }`}
    >
      {/* top row: ID + open link */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <Link
          href={`/orders/${order.id}?origin=orders`}
          className="font-mono text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          #{order.id.slice(0, 8)}
        </Link>
        <Link
          href={`/orders/${order.id}?origin=orders`}
          aria-label={`Otevřít objednávku ${order.id}`}
          className="rounded-md border border-zinc-800 p-1 text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:border-zinc-600 hover:text-zinc-200"
        >
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* customer name + call shortcut */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="truncate text-xs font-semibold text-zinc-100">
          {order.lead_name}
        </span>
        {order.lead_id && (
          <Link
            href={`/leads/${order.lead_id}`}
            title="Přejít na profil zákazníka"
            className="shrink-0 rounded p-0.5 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
          >
            <PhoneCall className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* product */}
      <p className="mb-2.5 truncate text-[11px] text-zinc-500">
        {order.product_title}
      </p>

      {/* pickup alert */}
      {isPickupAlert && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300">
          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
          Leží na výdejně {daysOnPickup} {daysOnPickup === 1 ? "den" : "dny/dní"}!
        </div>
      )}

      {/* package location (non-alert) */}
      {order.package_location && !isPickupAlert && (
        <p className="mb-2 truncate text-[10px] text-amber-300/80">
          📍 {order.package_location}
        </p>
      )}

      {/* retence countdown */}
      {daysUntilRetence !== null && (
        <div className="mb-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-500/8 px-2.5 py-1.5 text-[11px] text-emerald-400/80">
          <RotateCcw className="h-3 w-3 shrink-0" />
          {daysUntilRetence > 0
            ? `P3 retence za ${daysUntilRetence} ${daysUntilRetence === 1 ? "den" : "dní"}`
            : "➜ Čeká v P3 retenční frontě!"}
        </div>
      )}

      {/* returned re-ship alert */}
      {order.status === "returned" && (
        <div className="mb-2.5 flex items-center justify-between rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300">
          <span className="flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3 shrink-0 text-rose-400" />
            Vratka ➜ Re-ship
          </span>
          <Link
            href={`/orders/${order.id}?origin=orders`}
            className="text-[10px] text-rose-200 underline hover:text-white"
          >
            P4 Záchrana
          </Link>
        </div>
      )}

      {/* footer: amount + carrier + date */}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-zinc-100">
            {formatCurrency(order.currency, order.total_amount)}
          </span>
          {order.carrier && (
            <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              {order.carrier}
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">
          {formatShortDate(order.created_at)}
        </span>
      </div>
    </article>
  );
}

// --- main export ---

export function OrderKanban({
  orders,
}: {
  orders: WorkspaceOrderDTO[];
  role?: WorkspaceRole;
}) {
  // group orders by status
  const grouped = Object.fromEntries(
    COLUMNS.map((col) => [col.id, orders.filter((o) => o.status === col.id)])
  ) as Record<ColumnId, WorkspaceOrderDTO[]>;

  // count pickup alerts across entire board
  const pickupAlertCount = orders.filter((o) => {
    const days = o.status === "sent" && o.package_location
      ? daysSince(o.package_arrived_at)
      : null;
    return days !== null && days >= 3 && !o.pickup_call_completed_at;
  }).length;

  return (
    <div className="space-y-4">
      {pickupAlertCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-xs font-semibold text-rose-300">
            {pickupAlertCount}{" "}
            {pickupAlertCount === 1
              ? "balíček leží na výdejně déle než 3 dny a nebyl obvolán!"
              : "balíčků leží na výdejně déle než 3 dny a nebyly obvolány!"}
            {" "}Jsou automaticky zařazeny do fronty P4.
          </p>
        </div>
      )}

      {/* kanban columns — horizontal scroll on small screens */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colOrders = grouped[col.id];
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className="flex w-64 shrink-0 flex-col gap-3 xl:w-72"
            >
              {/* column header */}
              <div
                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${col.accentClass}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
                    {col.label}
                  </span>
                </div>
                <StatusBadge tone={col.countTone}>
                  {colOrders.length}
                </StatusBadge>
              </div>

              {/* cards */}
              <div className="flex flex-col gap-2.5">
                {colOrders.length === 0 ? (
                  <Surface variant="inset">
                    <p className="p-4 text-center text-[11px] text-zinc-600">
                      Žádné objednávky
                    </p>
                  </Surface>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
