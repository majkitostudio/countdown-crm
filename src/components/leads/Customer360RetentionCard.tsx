import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, PhoneCall, ShoppingBag } from "lucide-react";
import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { LeadDTO } from "@/lib/dal/leads";
import { buildCustomer360Snapshot, type Customer360Snapshot } from "@/lib/customer360";

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

function formatAmount(value: number, currency: string | null): string {
  if (!currency) return "Unavailable";
  try {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
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
    <section id="customer-360" className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6" data-testid="customer-360-retention">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Customer 360 · Retention playbook</h2>
          <p className="mt-1 text-xs text-zinc-500">Přehled skutečné historie zákazníka a další vysvětlitelný krok.</p>
        </div>
        <span className="w-fit rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-500">Persisted workspace data</span>
      </div>

      {activityUnavailable ? (
        <div role="status" className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-xs text-zinc-500">Customer activity není dostupná. Retenční doporučení nebylo vytvořeno z náhradních dat.</div>
      ) : snapshot ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SnapshotMetric label="Calls" value={String(snapshot.totalCalls)} icon={PhoneCall} />
            <SnapshotMetric label="Orders" value={`${snapshot.fulfilledOrders}/${snapshot.totalOrders}`} icon={ShoppingBag} detail="fulfilled / total" />
            <SnapshotMetric label="Revenue" value={formatAmount(snapshot.totalRevenue, snapshot.currency)} icon={CheckCircle2} />
            <SnapshotMetric label="Last touch" value={formatDate(snapshot.lastCallAt)} icon={CalendarClock} compact />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Latest order</p>
              <p className="mt-1 text-xs font-medium text-zinc-200">{snapshot.lastProduct || "No order yet"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatDate(snapshot.lastOrderAt)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Last call outcome</p>
              <p className="mt-1 text-xs font-medium text-zinc-200">{snapshot.lastCallOutcome?.replaceAll("_", " ") || "No call yet"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{formatDate(snapshot.lastCallAt)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Next retention action</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{snapshot.nextAction.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{snapshot.nextAction.description}</p>
            </div>
            <Link href={snapshot.nextAction.href} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white">
              Open action <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

function SnapshotMetric({
  label,
  value,
  detail,
  compact = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  compact?: boolean;
  icon: typeof PhoneCall;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500"><span>{label}</span><Icon className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" /></div>
      <p className={`${compact ? "text-xs leading-relaxed" : "text-xl"} mt-2 font-mono font-semibold text-zinc-100`}>{value}</p>
      {detail && <p className="mt-1 text-[10px] text-zinc-500">{detail}</p>}
    </div>
  );
}
