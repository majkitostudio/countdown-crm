"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, PhoneCall, Sparkles, Clock, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { getReorderOpportunities, ReorderOpportunity } from "@/lib/reorder";
import { cn } from "@/lib/utils";

export function ReorderWidget() {
  const [opportunities, setOpportunities] = useState<ReorderOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getReorderOpportunities();
      setOpportunities(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Predictive Re-Order Engine
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Auto-Calculated
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Customers approaching supply depletion (30/45-day retention cycle)
            </p>
          </div>
        </div>

        <Link
          href="/leads"
          className="text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          View all leads <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400 font-mono">
          Calculating replenishment rates...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          No re-order opportunities due in the next 14 days.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opportunities.slice(0, 4).map((op) => (
            <div
              key={op.id}
              className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700/80 transition-all flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {op.lead_name}
                  </span>
                  {op.urgency === "urgent" ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" /> Urgent ({op.days_remaining}d)
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      Due in {op.days_remaining} days
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{op.product_title}</span>
                  <span className="text-emerald-400 font-mono text-[10px]">(-{op.suggested_discount}%)</span>
                </div>
              </div>

              <Link
                href={`/workspace?leadId=${op.lead_id}`}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                Call
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
