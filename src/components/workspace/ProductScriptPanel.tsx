"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { Product } from "@/lib/products";
import { getProductScript, interpolateScript } from "@/lib/productScripts";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  onApplyPitch?: (pitchText: string) => void;
  direction?: "Incoming" | "Outgoing";
}

export function ProductScriptPanel({ product, isCallActive, onApplyPitch, direction = "Outgoing" }: ProductScriptPanelProps) {
  const script = useMemo(() => getProductScript(product), [product]);
  const [showGuardrails, setShowGuardrails] = useState(false);
  const [suggestionType, setSuggestionType] = useState<"default" | "price" | "effectiveness" | "hesitation">("default");

  const suggestion = suggestionType === "default"
    ? script.nextBestAction
    : script.objectionResponses[suggestionType] || script.objectionResponses.hesitation || script.nextBestAction;
  const suggestionLabel = suggestionType === "default" ? "Next best action" : `${suggestionType} concern`;
  const scriptLines = [
    interpolateScript(script.opening, product),
    ...script.discoveryQuestions,
    ...script.approvedBenefits,
  ];

  const applySuggestion = () => onApplyPitch?.(suggestion);

  return (
    <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-100">Product Script</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                {direction}
              </span>
            </div>
            <p className="truncate text-[11px] text-zinc-400">{product?.title || "Select a product"} · read verbatim</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Read exactly as written</p>
            <ol className="mt-3 space-y-4">
              {scriptLines.map((line, index) => (
                <li key={`${index}-${line}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-mono text-[10px] text-zinc-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-100">{line}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Operator cue</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">{script.nextBestAction}</p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Approved response</p>
                <p className="mt-1 text-xs font-semibold text-zinc-200">{suggestionLabel}</p>
              </div>
              <Sparkles className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">{suggestion}</p>
            <button
              type="button"
              onClick={applySuggestion}
              disabled={!isCallActive}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use exact line <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t border-zinc-800/80 pt-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["default", "Next step"],
            ["price", "Price concern"],
            ["effectiveness", "Effectiveness"],
          ].map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => setSuggestionType(type as "default" | "price" | "effectiveness")}
              className={`rounded-lg border px-2 py-2 text-[10px] font-medium transition-colors ${suggestionType === type ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => setShowGuardrails((value) => !value)} className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-zinc-400">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Script guardrails</span>
          {showGuardrails ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
        {showGuardrails && <ul className="list-disc space-y-1.5 pl-5 text-[11px] text-zinc-500">{script.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul>}
      </div>
    </section>
  );
}
