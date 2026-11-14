"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, PhoneCall, Sparkles, ArrowRight } from "lucide-react";
import { loadReorderOpportunitiesAction } from "@/app/actions/dashboard";
import type { ReorderOpportunity } from "@/lib/reorder";

export function ReorderWidget({ scope = "workspace" }: { scope?: "team" | "workspace" }) {
  const [opportunities, setOpportunities] = useState<ReorderOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null);
        const result = await loadReorderOpportunitiesAction();
        if (!result.ok) {
          setOpportunities([]);
          setLoadError(result.message);
          return;
        }
        setOpportunities(result.data);
      } catch (error) {
        setOpportunities([]);
        setLoadError(error instanceof Error ? error.message : "Data opakovaných objednávek se nepodařilo načíst.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800 shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100 flex flex-wrap items-center gap-2">
              Příležitosti k opakované objednávce
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Orientační odhad
              </span>
            </h2>
            <p className="text-xs text-zinc-400 break-words">
              Odhad termínů doplnění zásob podle historie vyřízených objednávek {scope === "team" ? "týmu" : "pracovního prostoru"} a cyklů kategorií produktů
            </p>
          </div>
        </div>

        <Link
          href="/leads"
          className="text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors duration-150 ease-interface"
        >
          Zobrazit všechny leady <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400 font-mono">
          Počítám termíny doplnění zásob…
        </div>
      ) : loadError ? (
        <div role="status" className="py-6 text-center text-xs text-zinc-500">
          Příležitosti k opakované objednávce nejsou dostupné, protože se nepodařilo načíst historii vyřízených objednávek.
        </div>
      ) : opportunities.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          V příštích 14 dnech nejsou žádné příležitosti k opakované objednávce.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opportunities.slice(0, 4).map((op) => (
            <div
              key={op.id}
              className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700/80 transition-all duration-150 ease-interface flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {op.lead_name}
                  </span>
                  {op.urgency === "urgent" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Naléhavé ({op.days_remaining} dní)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Za {op.days_remaining} dní
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{op.product_title}</span>
                </div>
              </div>

              <Link
                href={`/console?leadId=${op.lead_id}`}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-colors duration-150 ease-interface flex items-center gap-1.5 shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5 text-zinc-300" />
                Zavolat
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
