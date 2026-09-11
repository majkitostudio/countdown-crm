import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, PhoneCall, ShoppingBag } from "lucide-react";
import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { LeadDTO } from "@/lib/dal/leads";
import { buildCustomer360Snapshot, type Customer360Snapshot } from "@/lib/customer360";
import { formatCurrencyAmounts } from "@/lib/currency";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface Customer360RetentionCardProps {
  lead: LeadDTO;
  activity: {
    calls: Array<Pick<WorkspaceCallDTO, "created_at" | "outcome">>;
    orders: Array<Pick<WorkspaceOrderDTO, "id" | "created_at" | "product_title" | "total_amount" | "currency" | "status">>;
  };
  activityUnavailable?: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return "No persisted activity";
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function Customer360RetentionCard({
  lead,
  activity,
  activityUnavailable = false,
}: Customer360RetentionCardProps) {
  const snapshot: Customer360Snapshot | null = activityUnavailable
    ? null
    : buildCustomer360Snapshot(lead, activity);

  return (
    <Surface variant="page">
    <section id="customer-360" className="space-y-4 p-6" data-testid="customer-360-retention">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Customer 360 · Retention playbook</h2>
          <p className="mt-1 text-xs text-zinc-500">Přehled skutečné historie zákazníka a další vysvětlitelný krok.</p>
        </div>
        <StatusBadge tone="neutral">Persisted workspace data</StatusBadge>
      </div>

      {activityUnavailable ? (
        <StatusAlert tone="neutral" role="status">Customer activity is unavailable. No retention recommendation was created from substitute data.</StatusAlert>
      ) : snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SnapshotMetric label="Calls" value={String(snapshot.totalCalls)} icon={PhoneCall} />
            <SnapshotMetric label="Orders" value={`${snapshot.fulfilledOrders}/${snapshot.totalOrders}`} icon={ShoppingBag} detail="fulfilled / total" />
            <SnapshotMetric
              label="Revenue"
              value={formatCurrencyAmounts(snapshot.revenueByCurrency)}
              detail={snapshot.revenueByCurrency.length > 1 ? "separate currencies; not summed" : undefined}
              icon={CheckCircle2}
            />
            <SnapshotMetric label="Last touch" value={formatDate(snapshot.lastCallAt)} icon={CalendarClock} compact />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Surface variant="inset"><div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Latest order</p>
              <p className="mt-1 text-xs font-medium text-zinc-200">{snapshot.lastProduct || "No order yet"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatDate(snapshot.lastOrderAt)}</p>
            </div></Surface>
            <Surface variant="inset"><div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Last call outcome</p>
              <p className="mt-1 text-xs font-medium text-zinc-200">{snapshot.lastCallOutcome?.replaceAll("_", " ") || "No call yet"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatDate(snapshot.lastCallAt)}</p>
            </div></Surface>
          </div>

          <Surface variant="inset"><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Next retention action</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{snapshot.nextAction.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{snapshot.nextAction.description}</p>
            </div>
            <Link href={snapshot.nextAction.href} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white">
              Open action <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div></Surface>
        </>
      ) : null}
    </section>
    </Surface>
  );
}

function SnapshotMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
  compact?: boolean;
  icon: typeof PhoneCall;
}) {
  return (
    <MetricCard label={label} value={value} detail={detail} />
  );
}
