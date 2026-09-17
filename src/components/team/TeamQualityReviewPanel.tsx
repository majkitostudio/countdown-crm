"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { CallQualityReviewDTO } from "@/lib/dal/callQualityReviews";
import type { CallQualitySignal } from "@/lib/callQualityReview";
import { FAIL_REASON_OPTIONS } from "@/lib/postCall";

const signalLabels: Record<string, string> = {
  missing_note: "Chybí poznámka",
  short_note: "Krátká poznámka",
  short_call: "Krátký hovor",
  missing_fail_reason: "Chybí důvod Failu",
};

const sectionLabels: Record<string, string> = {
  client_problems: "Potřeby klienta",
  discovered_information: "Zjištěné informace",
  client_goal: "Cíl klienta",
  offers_and_prices: "Nabídky a ceny",
  offer_reactions: "Reakce na nabídky",
  outcome_and_next_step: "Výsledek a další krok",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusCopy(status: CallQualityReviewDTO["status"]): { label: string; className: string } {
  if (status === "review") return { label: "Doporučeno zkontrolovat", className: "border-zinc-600 bg-zinc-900 text-zinc-200" };
  if (status === "unavailable") return { label: "AI nedostupná", className: "border-zinc-700 bg-zinc-900 text-zinc-400" };
  if (status === "pending") return { label: "Kontrola probíhá", className: "border-zinc-700 bg-zinc-900 text-zinc-300" };
  return { label: "Pravděpodobně v pořádku", className: "border-zinc-700 bg-zinc-900 text-zinc-400" };
}

function outcomeCopy(outcome: string): string {
  if (outcome === "order_placed") return "Prodej";
  if (outcome === "objection") return "Fail";
  if (outcome === "no_answer") return "Bez spojení";
  if (outcome === "followup_scheduled") return "Callback";
  return outcome;
}

export function TeamQualityReviewPanel({ reviews }: { reviews: CallQualityReviewDTO[] }) {
  const [status, setStatus] = useState("review");
  const [signal, setSignal] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [failReason, setFailReason] = useState("all");
  const [search, setSearch] = useState("");

  const hasActiveFilters = status !== "all" || signal !== "all" || outcome !== "all" || failReason !== "all" || search.trim().length > 0;

  const filteredReviews = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("cs-CZ");
    return reviews.filter((review) => {
      if (status !== "all" && review.status !== status) return false;
      if (signal !== "all" && !review.signals.includes(signal as CallQualitySignal)) return false;
      if (outcome === "sale" && review.call.outcome !== "order_placed") return false;
      if (outcome === "fail" && review.call.outcome !== "objection") return false;
      if (outcome === "successful_review" && (review.call.outcome !== "order_placed" || review.status !== "review")) return false;
      if (failReason !== "all" && review.call.failReason !== failReason) return false;
      if (normalizedSearch) {
        const haystack = `${review.operator?.name || ""} ${review.customer?.name || ""} ${review.reasons.join(" ")}`.toLocaleLowerCase("cs-CZ");
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [failReason, outcome, reviews, search, signal, status]);

  return (
    <section className="space-y-5" aria-labelledby="team-quality-review-heading">
      <header>
        <h2 id="team-quality-review-heading" className="text-lg font-semibold text-zinc-100">Kontrola kvality hovorů</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          AI pouze vytipuje záznamy k běžné kontrole Team Leaderem. Nemění výsledek hovoru, objednávku ani práci operátora.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-zinc-500" htmlFor="quality-status-filter">
          Stav AI kontroly
          <select id="quality-status-filter" name="quality-status" value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            <option value="all">Vše</option>
            <option value="review">Doporučeno zkontrolovat</option>
            <option value="unavailable">AI nedostupná</option>
            <option value="ok">Pravděpodobně v pořádku</option>
            <option value="pending">Kontrola probíhá</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500" htmlFor="quality-signal-filter">
          Signál
          <select id="quality-signal-filter" name="quality-signal" value={signal} onChange={(event) => setSignal(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            <option value="all">Všechny signály</option>
            <option value="missing_note">Chybí poznámka</option>
            <option value="short_note">Krátká poznámka</option>
            <option value="short_call">Krátký hovor</option>
            <option value="missing_fail_reason">Chybí důvod Failu</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500" htmlFor="quality-outcome-filter">
          Typ hovoru
          <select id="quality-outcome-filter" name="quality-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            <option value="all">Všechny hovory</option>
            <option value="sale">Úspěšné hovory / prodeje</option>
            <option value="successful_review">Úspěch s doporučením kontroly</option>
            <option value="fail">Faily</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500" htmlFor="quality-fail-reason-filter">
          Důvod Failu
          <select id="quality-fail-reason-filter" name="quality-fail-reason" value={failReason} onChange={(event) => setFailReason(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
            <option value="all">Všechny důvody</option>
            {FAIL_REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-zinc-500" htmlFor="quality-search-filter">
          Hledat operátora nebo klienta
          <input id="quality-search-filter" name="quality-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Začněte psát…" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span>Zobrazeno {filteredReviews.length} z {reviews.length} kontrol</span>
        <div className="flex items-center gap-3">
          <span>Kontrola probíhá pouze u reálných hovorů</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setStatus("all"); setSignal("all"); setOutcome("all"); setFailReason("all"); setSearch(""); }}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Zrušit filtry
            </button>
          )}
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center text-sm text-zinc-500">
          Pro zvolené filtry nejsou žádné výsledky.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const statusInfo = statusCopy(review.status);
            return (
              <article key={review.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-zinc-100">{review.customer?.name || "Neznámý klient"}</h3>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400">{outcomeCopy(review.call.outcome)}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Operátor: {review.operator?.name || "Neznámý operátor"} · {formatDuration(review.call.durationSeconds)} · {new Date(review.call.createdAt).toLocaleString("cs-CZ")}
                    </p>
                  </div>
                  <a href={`/calls/${review.callId}/review`} className="text-xs font-semibold text-sky-300 hover:text-sky-200">Otevřít hovor a poznámku →</a>
                </div>

                {review.signals.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.signals.map((entry) => <span key={entry} className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400">{signalLabels[entry] || entry}</span>)}
                  </div>
                )}

                {review.reasons.length > 0 && (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs font-semibold text-zinc-300">Důvod doporučení</p>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-500">
                      {review.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                  </div>
                )}

                {review.missingSections.length > 0 && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Podezření na neúplnost: {review.missingSections.map((section) => sectionLabels[section] || section).join(", ")}.
                  </p>
                )}

                {review.call.operatorNote && (
                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-400">„{review.call.operatorNote}“</p>
                )}

                {review.status === "unavailable" && (
                  <p className="mt-3 text-xs text-amber-200/70">AI výsledek není k dispozici; tento hovor se nesmí považovat za automaticky v pořádku.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
