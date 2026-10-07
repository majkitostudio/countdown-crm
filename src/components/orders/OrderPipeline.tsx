"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, LoaderCircle, MapPin, PhoneCall, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { StatusAlert, StatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { CarrierExportDropdown } from "@/components/orders/CarrierExportDropdown";

type PipelineStatus = "all" | "sent_and_returned" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";

const filters: Array<{ value: PipelineStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "sent_and_returned", label: "🔥 Senty & Returny" },
  { value: "in_progress", label: "In-Progress" },
  { value: "sent", label: "Sent" },
  { value: "cancelled", label: "Cancelled" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function getOrderStatusTone(status: string): SemanticTone {
  if (status === "completed" || status === "delivered") return "success";
  if (status === "cancelled" || status === "returned") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "in_progress") return "In-Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function OrderPipeline({
  orders,
  role,
  onBulkStatusUpdate,
}: {
  orders: WorkspaceOrderDTO[];
  role?: WorkspaceRole;
  onBulkStatusUpdate?: (
    orderIds: string[],
    status: "sent" | "delivered" | "returned" | "cancelled",
    note?: string | null
  ) => Promise<{ successCount: number; failureCount: number; errors: string[] }>;
}) {
  const [activeFilter, setActiveFilter] = useState<PipelineStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const isManager = role === "team_leader" || role === "administrator";
  const normalizedSearch = search.trim().toLowerCase();

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus =
          activeFilter === "all" ||
          (activeFilter === "sent_and_returned"
            ? order.status === "sent" || order.status === "returned"
            : order.status === activeFilter);
        const matchesSearch =
          !normalizedSearch ||
          [order.id, order.lead_name, order.product_title, order.agent_name]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesSearch;
      }),
    [activeFilter, normalizedSearch, orders],
  );

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id)),
    [orders, selectedIds]
  );

  const isAllVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((order) => selectedIds.has(order.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const order of visibleOrders) {
          next.delete(order.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const order of visibleOrders) {
          next.add(order.id);
        }
        return next;
      });
    }
  }

  function handleBulkStatus(status: "sent" | "delivered" | "returned" | "cancelled") {
    if (selectedIds.size === 0) return;
    setMessage(null);

    const idsToUpdate = Array.from(selectedIds);
    startTransition(async () => {
      try {
        if (!onBulkStatusUpdate) {
          throw new Error("Bulk status update is not available.");
        }
        const result = await onBulkStatusUpdate(idsToUpdate, status);
        if (result.failureCount === 0) {
          setMessage({
            text: `Successfully updated ${result.successCount} ${result.successCount === 1 ? "order" : "orders"} to ${statusLabel(status)}.`,
            tone: "success",
          });
          setSelectedIds(new Set());
        } else {
          setMessage({
            text: `Updated ${result.successCount} orders; ${result.failureCount} failed: ${result.errors.join("; ")}`,
            tone: result.successCount > 0 ? "success" : "danger",
          });
        }
      } catch (err) {
        setMessage({
          text: err instanceof Error ? err.message : "Bulk status update failed",
          tone: "danger",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      {message && <StatusAlert tone={message.tone}>{message.text}</StatusAlert>}

      {isManager && selectedIds.size > 0 && (
        <Surface variant="page" className="p-4" data-testid="bulk-action-bar">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-100">
                Selected <span className="font-mono text-zinc-200">{selectedIds.size}</span> {selectedIds.size === 1 ? "order" : "orders"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-zinc-400 underline transition-colors hover:text-zinc-200"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CarrierExportDropdown
                orders={selectedOrders}
                label={`Export štítků (${selectedIds.size})`}
                variant="secondary"
                dataTestId="bulk-carrier-export"
                onExport={(format, count) => {
                  setMessage({
                    text: `Exportováno ${count} ${count === 1 ? "objednávka" : "objednávek"} pro ${format.toUpperCase()}.`,
                    tone: "success",
                  });
                }}
              />
              <div className="hidden h-4 w-px bg-zinc-800 sm:block" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">Change status:</span>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() => handleBulkStatus("sent")}
              >
                {isUpdating && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Mark Sent
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isUpdating}
                onClick={() => handleBulkStatus("delivered")}
              >
                {isUpdating && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Mark Delivered
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() => handleBulkStatus("returned")}
              >
                {isUpdating && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                Mark Returned
              </Button>
              <Button
                type="button"
                variant="quiet"
                disabled={isUpdating}
                onClick={() => handleBulkStatus("cancelled")}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Surface>
      )}

      <Surface variant="table">
        <div className="flex flex-col gap-3 border-b border-zinc-800/80 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const count =
                filter.value === "all"
                  ? orders.length
                  : filter.value === "sent_and_returned"
                  ? orders.filter((order) => order.status === "sent" || order.status === "returned").length
                  : orders.filter((order) => order.status === filter.value).length;
              return (
                <Button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  variant={activeFilter === filter.value ? "primary" : "secondary"}
                >
                  {filter.label} <span className="ml-1 font-mono opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <CarrierExportDropdown
              orders={visibleOrders}
              label="Export pro dopravce"
              variant="secondary"
              align="right"
              dataTestId="pipeline-carrier-export"
              onExport={(format, count) => {
                setMessage({
                  text: `Exportováno ${count} ${count === 1 ? "objednávka" : "objednávek"} pro ${format.toUpperCase()}.`,
                  tone: "success",
                });
              }}
            />
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto mb-4 h-8 w-8 text-zinc-600" />
            <h2 className="text-sm font-semibold text-zinc-200">No matching orders</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">Try another status or search term.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-zinc-800/60 md:hidden">
              {visibleOrders.map((order) => (
                <article key={order.id} className="space-y-3 p-4" data-testid="mobile-order-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isManager && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`Select order ${order.id}`}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                        />
                      )}
                      <div className="min-w-0">
                        <Link href={`/orders/${order.id}?origin=orders`} className="block truncate font-mono text-xs text-zinc-200 hover:text-white">#{order.id}</Link>
                        <span className="mt-1 block text-[11px] text-zinc-500">{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                    <Link href={`/orders/${order.id}?origin=orders`} aria-label={`Open order ${order.id}`} className="inline-flex shrink-0 rounded-lg border border-zinc-800 p-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Customer</dt>
                      <dd className="mt-1 flex items-center gap-1.5 truncate font-medium text-zinc-200">
                        <span className="truncate">{order.lead_name}</span>
                        {order.lead_id && (
                          <Link
                            href={`/leads/${order.lead_id}`}
                            title="Zavolat zákazníkovi"
                            className="inline-flex shrink-0 p-1 text-sky-400 hover:text-sky-300 rounded hover:bg-sky-500/10 transition-colors"
                          >
                            <PhoneCall className="h-3 w-3" />
                          </Link>
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Product</dt><dd className="mt-1 truncate text-zinc-300">{order.product_title}</dd></div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Status</dt>
                      <dd className="mt-1 space-y-1">
                        <StatusBadge tone={getOrderStatusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                        {order.package_location && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-300 truncate" title={order.package_location}>
                            <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                            <span className="truncate">{order.package_location}</span>
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Operator</dt><dd className="mt-1 truncate text-zinc-400">{order.agent_name}</dd></div>
                    <div><dt className="text-[10px] uppercase tracking-wider text-zinc-600">Total</dt><dd className="mt-1 font-mono font-semibold text-zinc-100">{order.currency} {order.total_amount.toFixed(2)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-zinc-300">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  {isManager && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all orders"
                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                      />
                    </th>
                  )}
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
                    {isManager && (
                      <td className="w-10 px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`Select order ${order.id}`}
                          className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0"
                        />
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <Link href={`/orders/${order.id}?origin=orders`} className="font-mono text-zinc-200 hover:text-white">#{order.id}</Link>
                      <span className="mt-1 block text-[11px] text-zinc-500">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-5 py-4 font-medium text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <span>{order.lead_name}</span>
                        {order.lead_id && (
                          <Link
                            href={`/leads/${order.lead_id}`}
                            title="Zavolat zákazníkovi (otevřít profil)"
                            className="inline-flex items-center justify-center rounded p-1 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
                          >
                            <PhoneCall className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block text-zinc-300">{order.product_title}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-zinc-600">{order.order_source.replaceAll("_", " ")}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div>
                          <StatusBadge tone={getOrderStatusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                        </div>
                        {order.package_location && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300/90 max-w-[220px] truncate" title={order.package_location}>
                            <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                            <span className="truncate">{order.package_location}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{order.agent_name}</td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-zinc-100">{order.currency} {order.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right"><Link href={`/orders/${order.id}?origin=orders`} aria-label={`Open order ${order.id}`} className="inline-flex rounded-lg border border-zinc-800 p-2 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-200"><ArrowRight className="h-3.5 w-3.5" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
}
