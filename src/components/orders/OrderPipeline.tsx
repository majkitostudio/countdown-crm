"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";

type PipelineStatus = "all" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";

const filters: Array<{ value: PipelineStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In-Progress" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusClass(status: string): string {
  if (status === "completed" || status === "delivered") return "border-emerald-900/60 bg-emerald-950/30 text-emerald-300";
  if (status === "sent") return "border-sky-900/60 bg-sky-950/30 text-sky-300";
  if (status === "in_progress") return "border-blue-900/60 bg-blue-950/30 text-blue-300";
  if (status === "cancelled" || status === "returned") return "border-rose-900/60 bg-rose-950/30 text-rose-300";
  if (status === "pending") return "border-amber-900/60 bg-amber-950/30 text-amber-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In-Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function OrderPipeline({ orders }: { orders: WorkspaceOrderDTO[] }) {
  const [activeFilter, setActiveFilter] = useState<PipelineStatus>("all");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus = activeFilter === "all" || order.status === activeFilter;
        const matchesSearch =
          !normalizedSearch ||
          [order.id, order.lead_name, order.product_title, order.agent_name]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
      }),
    [activeFilter, normalizedSearch, orders],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-800/80 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const count = filter.value === "all" ? orders.length : orders.filter((order) => order.status === filter.value).length;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-lg border px-3 py-2 text-[11px] transition-colors ${
                  activeFilter === filter.value
                    ? "border-zinc-500 bg-zinc-100 text-zinc-950"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {filter.label} <span className="ml-1 font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="relative block lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <span className="sr-only">Search orders</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-2 pl-9 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </label>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="p-12 text-center">
          <ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
          <h2 className="text-sm font-semibold text-zinc-200">No matching orders</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">Try another status or search term.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {visibleOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-zinc-800/30">
                  <td className="px-5 py-4">
                    <Link href={`/orders/${order.id}?origin=orders`} className="font-mono text-zinc-200 hover:text-white">#{order.id}</Link>
                    <span className="mt-1 block text-[11px] text-zinc-500">{formatDate(order.created_at)}</span>
                  </td>
                  <td className="px-5 py-4 font-medium text-zinc-200">{order.lead_name}</td>
                  <td className="px-5 py-4">
                    <span className="block text-zinc-300">{order.product_title}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-zinc-600">{order.order_source.replaceAll("_", " ")}</span>
                  </td>
                  <td className="px-5 py-4"><span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></td>
                  <td className="px-5 py-4 text-zinc-400">{order.agent_name}</td>
                  <td className="px-5 py-4 text-right font-mono font-semibold text-zinc-100">{order.currency} {order.total_amount.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right"><Link href={`/orders/${order.id}?origin=orders`} aria-label={`Open order ${order.id}`} className="inline-flex rounded-lg border border-zinc-800 p-2 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-200"><ArrowRight className="h-3.5 w-3.5" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
