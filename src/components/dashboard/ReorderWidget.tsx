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
    <div className="min-w-0 space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6">
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 items-start gap-2.5">
          <div className="hidden shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-300 sm:block">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-100 flex flex-wrap items-center gap-2">
              Příležitosti k opakované objednávce
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
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
          className="self-start text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors duration-150 ease-interface sm:self-auto"
        >
          Zobrazit všechny leady <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400">
          Počítám termíny doplnění zásob…
        </div>
      ) : loadError ? (
        <div role="status" className="py-6 text-center text-xs text-zinc-400">
          Příležitosti k opakované objednávce nejsou dostupné, protože se nepodařilo načíst historii vyřízených objednávek.
        </div>
      ) : opportunities.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-400">
          V příštích 14 dnech nejsou žádné příležitosti k opakované objednávce.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opportunities.slice(0, 4).map((op) => (
            <div
              key={op.id}
              className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700/80 transition-all duration-150 ease-interface flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="w-full min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/leads/${op.lead_id}`}
                    aria-label={`Otevřít kontakt ${op.lead_name}`}
                    className="max-w-full text-xs font-medium text-zinc-200 underline underline-offset-2 [overflow-wrap:anywhere]"
                  >
                    {op.lead_name}
                  </Link>
                  {op.urgency === "urgent" ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Naléhavé (<span className="font-mono tabular-nums">{op.days_remaining}</span> dní)
                    </span>
                  ) : (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Za <span className="font-mono tabular-nums">{op.days_remaining}</span> dní
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 items-start gap-1.5 text-[11px] text-zinc-400">
                  <Sparkles className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{op.product_title}</span>
                </div>
              </div>

              <Link
                href={`/console?leadId=${op.lead_id}`}
                className="self-start px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-colors duration-150 ease-interface flex items-center gap-1.5 shrink-0 sm:self-auto"
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
