"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  PhoneCall,
  Search,
  Eye,
} from "lucide-react";
import { CallRecord, formatCallOutcome, getCalls, summarizeCallDurations } from "@/lib/calls";
import { getCallOutcomeClassName } from "@/lib/callOutcomeStyles";
import { formatCurrencyAmount } from "@/lib/currency";
import { CallDetailDrawer } from "@/components/calls/CallDetailDrawer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils";

function useReviewQueryFilter() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => (new URLSearchParams(window.location.search).get("review") === "unreviewed" ? "unreviewed" : null),
    () => null,
  );
}

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutcomeFilterState, setSelectedOutcomeFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const reviewQueryFilter = useReviewQueryFilter();
  const selectedOutcomeFilter = reviewQueryFilter === "unreviewed" ? "unreviewed" : selectedOutcomeFilterState;

  useEffect(() => {
    async function loadCalls() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getCalls();
        setCalls(data);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Záznamy hovorů se nepodařilo načíst.");
      } finally {
        setIsLoading(false);
      }
    }
    loadCalls();
  }, [loadAttempt]);

  const selectOutcomeFilter = (filter: string) => {
    setSelectedOutcomeFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter === "unreviewed") {
      params.set("review", "unreviewed");
    } else {
      params.delete("review");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/call-logs?${query}` : "/call-logs");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      c.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedOutcomeFilter === "all") return matchesSearch;
    if (selectedOutcomeFilter === "unreviewed") {
      return matchesSearch && c.review_status === "not_reviewed";
    }
    return matchesSearch && c.outcome === selectedOutcomeFilter;
  });

  const canReview = calls.some((call) => call.review_href !== null);
  const unreviewedCount = calls.filter((call) => call.review_status === "not_reviewed").length;

  const reviewHrefForCall = (call: CallRecord) => {
    if (!call.review_href || selectedOutcomeFilter !== "unreviewed") return call.review_href;
    return `${call.review_href}?return=unreviewed`;
  };

  const reviewStatusLabel = (status: CallRecord["review_status"]) => {
    if (status === "not_reviewed") return "Nezkontrolováno";
    if (status === "corrected") return "Opraveno";
    if (status === "reviewed") return "Zkontrolováno";
    return null;
  };

  const totalCallsCount = calls.length;
  const { average: avgDuration, recordedCount } = summarizeCallDurations(calls);

  const salesCompletedCount = calls.filter((c) => c.outcome === "order_placed").length;
  const conversionRate = totalCallsCount > 0 ? Math.round((salesCompletedCount / totalCallsCount) * 100) : 0;

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto animate-in fade-in duration-120 ease-interface">
      
      <PageHeader
        icon={PhoneCall}
        title="Záznamy hovorů"
        badge={{ label: `${totalCallsCount} zaznamenaných`, tone: "neutral" }}
        description="Zaznamenané výsledky hovorů a ověřené zachycené přepisy. Záznam nemusí obsahovat audio ani přepis."
actions={
          <div className="flex items-center gap-2">
            {canReview && (
              <Link
                href="/call-logs?review=unreviewed"
                className={getButtonClassName("secondary")}
              >
                Nezkontrolované: {unreviewedCount}
              </Link>
            )}
            <Link
              href="/console"
              className={getButtonClassName("primary")}
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Spustit operátorskou konzoli</span>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-120 ease-interface">
        <MetricCard label="Zaznamenané hovory" value={totalCallsCount} />
        <MetricCard label="Průměrné zpracování" value={avgDuration == null ? "—" : formatDuration(avgDuration)} detail={recordedCount < totalCallsCount ? `Z ${recordedCount} hovorů se zaznamenanou délkou` : undefined} />
        <MetricCard
          label="Objem objednávek u hovorů"
          value="Nelze bezpečně sečíst"
          detail="Zobrazuje se hodnota jednotlivých hovorů; souhrn zde není k dispozici."
        />
        <MetricCard label="Konverze" value={`${conversionRate}%`} />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Hledat hovory"
              placeholder="Hledat zákazníka, operátora nebo ID hovoru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-base sm:text-sm text-zinc-200 placeholder:text-zinc-400"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => selectOutcomeFilter("all")}
              aria-pressed={selectedOutcomeFilter === "all"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ease-interface cursor-pointer ${
                selectedOutcomeFilter === "all"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Všechny záznamy ({calls.length})
            </button>
            <button
              type="button"
              onClick={() => selectOutcomeFilter("order_placed")}
              aria-pressed={selectedOutcomeFilter === "order_placed"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ease-interface cursor-pointer ${
                selectedOutcomeFilter === "order_placed"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Objednávka vytvořena
            </button>
            <button
              type="button"
              onClick={() => selectOutcomeFilter("followup_scheduled")}
              aria-pressed={selectedOutcomeFilter === "followup_scheduled"}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ease-interface cursor-pointer ${
                selectedOutcomeFilter === "followup_scheduled"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Naplánované hovory
            </button>
            {canReview && (
              <button
                type="button"
                onClick={() => selectOutcomeFilter("unreviewed")}
                aria-pressed={selectedOutcomeFilter === "unreviewed"}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ease-interface cursor-pointer ${
                  selectedOutcomeFilter === "unreviewed"
                    ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                Nezkontrolované
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Call Logs Table */}
      <Surface variant="table">
        <div
          role="region"
          aria-label="Tabulka záznamů hovorů"
          aria-busy={isLoading}
          tabIndex={0}
          className="overflow-x-auto"
        >
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-zinc-800/80">
              <tr>
                <th className="px-5 py-3">ID hovoru a zákazník</th>
                <th className="px-5 py-3">Operátor</th>
                <th className="px-5 py-3">Délka</th>
                <th className="px-5 py-3">Výsledek</th>
                <th className="px-5 py-3">Hodnota u hovoru</th>
                <th className="px-5 py-3">Kontrola hovoru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-zinc-200">Načítám záznamy hovorů…</p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-rose-200">Záznamy hovorů se nepodařilo načíst.</p>
                    <p className="mt-1 text-xs text-zinc-300">{loadError}</p>
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        className={getButtonClassName("secondary")}
                        onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                      >
                        Zkusit znovu
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-zinc-200">
                      {selectedOutcomeFilter === "unreviewed"
                        ? "Všechny dostupné hovory jsou zkontrolované."
                        : "Filtrům neodpovídá žádný hovor."}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {selectedOutcomeFilter === "unreviewed"
                        ? "V tomto seznamu nezbývá žádná práce pro vedoucího týmu."
                        : "Zkuste jiný výsledek nebo jiný hledaný výraz."}
                    </p>
                  </td>
                </tr>
              ) : filteredCalls.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors duration-150 ease-interface">
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{c.lead_name}</p>
                      <p className="text-xs text-zinc-400 font-mono">#{c.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-300">{c.agent_name}</td>
                  <td className="px-5 py-3 font-mono text-zinc-300">{c.duration_seconds == null ? "—" : formatDuration(c.duration_seconds)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getCallOutcomeClassName(c.outcome)}`}>
                      {formatCallOutcome(c.outcome)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono font-semibold text-zinc-200">
                    <span>{formatCurrencyAmount(c.order_value, "CZK")}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">
                        {canReview ? reviewStatusLabel(c.review_status) || "Nedostupné" : "Nedostupné"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {canReview && c.review_href && (
                          <Link
                            href={reviewHrefForCall(c) || "#"}
                            className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 transition-colors duration-150 ease-interface hover:bg-zinc-800 hover:text-zinc-200"
                            aria-label={`Otevřít kontrolu pro ${c.lead_name}`}
                            title="Otevřít kontrolu"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedCall(c)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors duration-150 ease-interface hover:bg-zinc-800"
                        aria-label={`Zobrazit záznam pro ${c.lead_name}`}
                        title="Zobrazit záznam"
                      >
                        <Eye className="h-3.5 w-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-zinc-800/60 px-5 py-2 text-[11px] text-zinc-400 sm:hidden">
          Tabulku lze posouvat do strany.
        </p>
      </Surface>

      {/* Call Detail Drawer */}
      <CallDetailDrawer
        call={selectedCall}
        reviewHref={selectedCall ? reviewHrefForCall(selectedCall) : null}
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />

    </div>
  );
}
