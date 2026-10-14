import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import {
  countOrdersByStage,
  ORDER_STAGES,
  ORDER_STAGE_LABELS,
  type OrderStage,
} from "@/lib/orderStage";
import { countOrdersByRisk } from "@/lib/orderRisk";

const STAGE_TONE: Record<OrderStage, string> = {
  processing: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  sent: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  awaiting_pickup: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  returned: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  cancelled: "border-zinc-600/40 bg-zinc-600/10 text-zinc-300",
};

/**
 * At-a-glance counters for the order board: how many orders sit in each stage
 * and how many packages are at risk at their pickup point.
 */
export function OrderStageSummary({ orders }: { orders: WorkspaceOrderDTO[] }) {
  const stageCounts = countOrdersByStage(orders);
  const risk = countOrdersByRisk(orders);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="order-stage-summary"
      aria-label="Souhrn objednávek podle fáze a rizika"
    >
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
        Total
        <span className="font-mono font-semibold text-zinc-100">{orders.length}</span>
      </span>

      <span className="hidden h-4 w-px bg-zinc-800 sm:block" />

      {ORDER_STAGES.map((stage) => (
        <span
          key={stage}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${STAGE_TONE[stage]}`}
        >
          {ORDER_STAGE_LABELS[stage]}
          <span className="font-mono font-semibold">{stageCounts[stage]}</span>
        </span>
      ))}

      <span className="hidden h-4 w-px bg-zinc-800 sm:block" />

      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
          risk.warning > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-zinc-700/40 bg-zinc-800/40 text-zinc-500"
        }`}
        title="2 dny na výdejně — blíží se limitu"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${risk.warning > 0 ? "bg-amber-400" : "bg-zinc-600"}`} />
        Warning
        <span className="font-mono font-semibold">{risk.warning}</span>
      </span>

      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
          risk.alarm > 0
            ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
            : "border-zinc-700/40 bg-zinc-800/40 text-zinc-500"
        }`}
        title="3+ dny na výdejně — automaticky do fronty P4"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${risk.alarm > 0 ? "bg-rose-400" : "bg-zinc-600"}`} />
        Alarm
        <span className="font-mono font-semibold">{risk.alarm}</span>
      </span>
    </div>
  );
}
