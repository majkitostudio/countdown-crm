"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, Search } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders";

type PipelineFilter = "all" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";

const FILTERS: Array<{ value: PipelineFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In-Progress" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  completed: "Completed (legacy)",
  pending: "Pending (legacy)",
  in_progress: "In-Progress",
  sent: "Sent",
  cancelled: "Cancelled",
  delivered: "Delivered",
  returned: "Returned",
};

interface OrderPipelineProps {
  orders: Order[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderPipeline({ orders }: OrderPipelineProps) {
  const [activeFilter, setActiveFilter] = useState<PipelineFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return FILTERS.reduce<Record<PipelineFilter, number>>((result, filter) => {
      result[filter.value] = filter.value === "all"
        ? orders.length
        : orders.filter((order) => order.status === filter.value).length;
      return result;
    }, {
      all: 0,
      in_progress: 0,
      sent: 0,
      cancelled: 0,
      delivered: 0,
      returned: 0,
    });
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return orders.filter((order) => {
      if (activeFilter !== "all" && order.status !== activeFilter) return false;
      if (!normalizedSearch) return true;

      return [order.id, order.lead_name, order.product_title, order.agent_name]
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [activeFilter, orders, search]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Operator workflow</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">Order Pipeline</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
              Track the orders permitted for your role. Operators see only orders attributed to their account.
            </p>
          </div>
          <Link
            href="/workspace?createOrder=1"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Order
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Order status filters">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{counts[filter.value]}</span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-0 xl:w-72">
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, product or order ID..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_9rem_8rem_9rem_2rem] gap-4 border-b border-zinc-800 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 max-lg:hidden">
          <span>Customer</span>
          <span>Product</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Created</span>
          <span className="sr-only">Open</span>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
            <PackageCheck className="h-8 w-8 text-zinc-700" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-zinc-300">No matching orders</h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
              This is a real empty state. No order permitted for your account currently matches this filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {visibleOrders.map((order) => (
              <article
                key={order.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_9rem_8rem_9rem_2rem] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{order.lead_name}</p>
                  <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{order.id}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-300">{order.product_title}</p>
                  <p className="mt-1 text-[10px] text-zinc-600">by {order.agent_name}</p>
                </div>
                <div>
                  <span className="inline-flex rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300">
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="font-mono text-xs font-semibold text-zinc-200">${order.total_amount.toFixed(2)}</p>
                <time dateTime={order.created_at} className="text-[10px] text-zinc-500">{formatDate(order.created_at)}</time>
                <span className="hidden text-[9px] text-zinc-600 lg:block" title="Follow-up calling will be added in a separate slice">
                  —
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-zinc-600">
        Historical <span className="font-medium text-zinc-500">Completed</span> and <span className="font-medium text-zinc-500">Pending</span> rows remain visible under All and are not reclassified as delivery events.
      </p>
    </div>
  );
}
