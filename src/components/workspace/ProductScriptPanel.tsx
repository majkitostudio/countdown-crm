"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { Product } from "@/lib/products";
import { getProductScript, interpolateScript, ObjectionKey, ScriptStage } from "@/lib/productScripts";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  onApplyPitch?: (pitchText: string) => void;
}

const stageLabels: Record<ScriptStage, string> = { offer: "Product offer", objection: "Objection handling", resume: "Resume product script", close: "Close" };

export function ProductScriptPanel({ product, isCallActive, onApplyPitch }: ProductScriptPanelProps) {
  const script = useMemo(() => getProductScript(product), [product]);
  const [stage, setStage] = useState<ScriptStage>("offer");
  const [selectedObjection, setSelectedObjection] = useState<ObjectionKey>("price_effectiveness");
  const [activeSection, setActiveSection] = useState<"opening" | "discovery" | "benefits" | "hooks">("opening");
  const [showGuardrails, setShowGuardrails] = useState(false);

  const objection = script.objectionBranches[selectedObjection];
  const currentText = stage === "offer" ? script.openingOffer : stage === "objection" ? objection.response : stage === "resume" ? script.resumeSteps[0] : script.close;

  const applyCurrent = () => onApplyPitch?.(currentText);

  return (
    <section className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300"><MessageSquareText className="w-4 h-4" /></div>
          <div>
            <div className="flex items-center gap-1.5"><h2 className="text-sm font-semibold text-zinc-100">Product Script</h2><span className="text-[10px] bg-zinc-950 text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-zinc-800 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI-assisted</span></div>
            <p className="text-[11px] text-zinc-400">{product?.title || "Select a product"} · approved script blocks</p>
          </div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded-md border ${isCallActive ? "border-emerald-800/80 text-emerald-300 bg-emerald-950/30" : "border-zinc-800 text-zinc-500"}`}>{isCallActive ? "Active" : "Ready"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["offer", "objection", "resume", "close"] as const).map((item, index) => (
          <React.Fragment key={item}>
            <button type="button" onClick={() => setStage(item)} className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${stage === item ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:text-zinc-200"}`}>{index + 1}. {stageLabels[item]}</button>
            {index < 3 && <ArrowRight className="w-3.5 h-3.5 text-zinc-700" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-5 space-y-4">
          <div><p className="text-[10px] uppercase tracking-wider text-zinc-500">{stageLabels[stage]}</p><p className="text-xs font-semibold text-zinc-200 mt-1">{stage === "objection" ? objection.label : "Current script block"}</p></div>
          <p className="text-base leading-relaxed text-zinc-100">{stage === "offer" ? interpolateScript(script.openingOffer, product) : currentText}</p>
          {stage === "offer" && <div className="text-xs text-zinc-400 border-t border-zinc-800 pt-3"><p className="text-zinc-300 font-semibold mb-1">Opening</p>{interpolateScript(script.opening, product)}</div>}
          {stage === "objection" && <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-3">Next: {objection.nextStep}</p>}
          {stage === "resume" && <ul className="text-xs text-zinc-400 list-disc pl-4 space-y-1.5 border-t border-zinc-800 pt-3">{script.resumeSteps.map((step) => <li key={step}>{step}</li>)}</ul>}
          <button type="button" onClick={applyCurrent} disabled={!isCallActive} className="px-4 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors flex items-center gap-2">Use script block <ArrowRight className="w-3.5 h-3.5" /></button>
        </div>

        <div className="space-y-3">
          {stage === "objection" ? <>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Select the customer concern</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-2">{(Object.keys(script.objectionBranches) as ObjectionKey[]).map((key) => <button key={key} type="button" onClick={() => setSelectedObjection(key)} className={`px-3 py-2.5 rounded-lg border text-left text-xs font-semibold ${selectedObjection === key ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950/50 text-zinc-400"}`}>{script.objectionBranches[key].label}</button>)}</div>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400"><p className="text-zinc-200 font-semibold mb-1">Clarifying prompt</p>{objection.prompt}</div>
            <button type="button" onClick={() => setStage("resume")} className="w-full px-3 py-2 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center justify-center gap-2"><ArrowLeft className="w-3.5 h-3.5" /> Return to product script</button>
          </> : <>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Need help during the call?</p>
            <button type="button" onClick={() => setStage("objection")} className="w-full px-3 py-3 rounded-lg border border-zinc-800 bg-zinc-950/50 text-left text-xs font-semibold text-zinc-300 hover:text-zinc-100">Open objection handling</button>
            <div className="border border-zinc-800 rounded-xl bg-zinc-950/40"><button type="button" onClick={() => setActiveSection(activeSection === "hooks" ? "opening" : "hooks")} className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-300"><span>Attention hooks</span>{activeSection === "hooks" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>{activeSection === "hooks" && <ul className="px-3 pb-3 space-y-1.5 text-xs text-zinc-400 list-disc pl-7">{script.attentionHooks.map((hook) => <li key={hook}>{hook}</li>)}</ul>}</div>
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {(["opening", "discovery", "benefits"] as const).map((section) => { const open = activeSection === section; return <div key={section} className="border border-zinc-800/80 rounded-lg bg-zinc-950/40"><button type="button" onClick={() => setActiveSection(open ? "opening" : section)} className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-zinc-200">{section === "opening" ? "Opening" : section === "discovery" ? "Discovery questions" : "Approved benefits"}{open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}</button>{open && <div className="px-3 pb-3 text-xs text-zinc-400 leading-relaxed">{section === "opening" && <p>{interpolateScript(script.opening, product)}</p>}{section === "discovery" && <ul className="space-y-1.5 list-disc pl-4">{script.discoveryQuestions.map((question) => <li key={question}>{question}</li>)}</ul>}{section === "benefits" && <ul className="space-y-1.5 list-disc pl-4">{script.approvedBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>}</div>}</div>; })}
      </div>

      <div className="border-t border-zinc-800/80 pt-3"><button type="button" onClick={() => setShowGuardrails((value) => !value)} className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-400"><span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Script guardrails</span>{showGuardrails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>{showGuardrails && <ul className="mt-2 space-y-1.5 text-[11px] text-zinc-500 list-disc pl-5">{script.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul>}</div>
    </section>
  );
}
