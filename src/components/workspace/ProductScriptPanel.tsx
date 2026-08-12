"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { Product } from "@/lib/products";
import { getProductScript, interpolateScript } from "@/lib/productScripts";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  onApplyPitch?: (pitchText: string) => void;
}

export function ProductScriptPanel({ product, isCallActive, onApplyPitch }: ProductScriptPanelProps) {
  const script = useMemo(() => getProductScript(product), [product]);
  const [activeSection, setActiveSection] = useState<"opening" | "discovery" | "benefits">("opening");
  const [showGuardrails, setShowGuardrails] = useState(false);
  const [suggestionType, setSuggestionType] = useState<"default" | "price" | "effectiveness" | "hesitation">("default");

  const suggestion = suggestionType === "default"
    ? script.nextBestAction
    : script.objectionResponses[suggestionType] || script.objectionResponses.hesitation || script.nextBestAction;
  const suggestionLabel = suggestionType === "default" ? "Next best action" : `${suggestionType} concern`;

  const applySuggestion = () => onApplyPitch?.(suggestion);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <MessageSquareText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-100">Product Script</h2>
              <span className="text-[10px] bg-zinc-950 text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-zinc-800 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI-assisted
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{product?.title || "Select a product"} · approved script blocks</p>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded-md border ${isCallActive ? "border-emerald-800/80 text-emerald-300 bg-emerald-950/30" : "border-zinc-800 text-zinc-500"}`}>
          {isCallActive ? "Active" : "Ready"}
        </span>
      </div>

      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Current suggestion</p>
            <p className="text-xs font-semibold text-zinc-200 mt-1">{suggestionLabel}</p>
          </div>
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </div>
        <p className="text-sm leading-relaxed text-zinc-100">{suggestion}</p>
        <button
          type="button"
          onClick={applySuggestion}
          disabled={!isCallActive}
          className="w-full px-3 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors flex items-center justify-center gap-2"
        >
          Use suggestion <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["default", "price", "effectiveness"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSuggestionType(type)}
            className={`px-2 py-2 rounded-lg border text-[10px] font-medium transition-colors ${suggestionType === type ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200"}`}
          >
            {type === "default" ? "Discovery" : type === "price" ? "Price concern" : "Effectiveness"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {(["opening", "discovery", "benefits"] as const).map((section) => {
          const isOpen = activeSection === section;
          return (
            <div key={section} className="border border-zinc-800/80 rounded-lg bg-zinc-950/40">
              <button type="button" onClick={() => setActiveSection(isOpen ? "opening" : section)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left">
                <span className="text-xs font-semibold text-zinc-200">{section === "opening" ? "Opening" : section === "discovery" ? "Discovery questions" : "Approved benefits"}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 text-xs text-zinc-400 leading-relaxed">
                  {section === "opening" && <p>{interpolateScript(script.opening, product)}</p>}
                  {section === "discovery" && <ul className="space-y-1.5 list-disc pl-4">{script.discoveryQuestions.map((question) => <li key={question}>{question}</li>)}</ul>}
                  {section === "benefits" && <ul className="space-y-1.5 list-disc pl-4">{script.approvedBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-zinc-800/80 pt-3">
        <button type="button" onClick={() => setShowGuardrails((value) => !value)} className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Script guardrails</span>
          {showGuardrails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showGuardrails && <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-500 list-disc pl-5">{script.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul>}
      </div>
    </section>
  );
}
