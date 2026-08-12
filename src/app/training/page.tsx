"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, CircleAlert, GraduationCap, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deterministicTrainingProvider,
  evaluateTrainingSession,
  TRAINING_SCENARIOS,
  TrainingMessage,
  TrainingScenario,
  TrainingScorecard,
} from "@/lib/training";

type TrainerStage = "setup" | "in_progress" | "complete";

export default function TrainingPage() {
  const [stage, setStage] = useState<TrainerStage>("setup");
  const [scenario, setScenario] = useState<TrainingScenario>(TRAINING_SCENARIOS[0]);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState("");
  const [nextResponses, setNextResponses] = useState(scenario.availableResponses);
  const [scorecard, setScorecard] = useState<TrainingScorecard | null>(null);

  const selectedScenario = useMemo(() => scenario, [scenario]);

  const startScenario = () => {
    setMessages([{ id: "opening", speaker: "customer", text: selectedScenario.openingMessage }]);
    setNextResponses(selectedScenario.availableResponses);
    setScorecard(null);
    setInput("");
    setStage("in_progress");
  };

  const finishScenario = (nextMessages = messages) => {
    setScorecard(evaluateTrainingSession(selectedScenario, nextMessages));
    setStage("complete");
  };

  const sendResponse = (text: string, intent?: TrainingMessage["intent"]) => {
    const trimmed = text.trim();
    if (!trimmed || stage !== "in_progress") return;
    const operatorMessage: TrainingMessage = { id: `operator-${Date.now()}`, speaker: "operator", text: trimmed };
    const reply = deterministicTrainingProvider.respond(selectedScenario, { intent: intent ?? "price_effectiveness", text: trimmed });
    const customerMessage: TrainingMessage = { id: `customer-${Date.now()}`, speaker: "customer", text: reply.text, intent: reply.intent };
    const nextMessages = [...messages, operatorMessage, customerMessage];
    setMessages(nextMessages);
    setNextResponses(reply.nextResponses);
    setInput("");
    if (reply.nextResponses.length === 0) finishScenario(nextMessages);
  };

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <header className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300"><GraduationCap className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Call Trainer</h1>
                <span className="rounded-full border border-amber-800/70 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Training simulation</span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">Practice the product script with a deterministic customer scenario. This does not create a call, lead, order, or production activity.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Production data protected</div>
        </div>
      </header>

      {stage === "setup" && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Choose a scenario</p>
            <div className="mt-4 space-y-3">
              {TRAINING_SCENARIOS.map((item) => (
                <button key={item.id} onClick={() => setScenario(item)} className={cn("w-full rounded-xl border p-4 text-left transition-colors", scenario.id === item.id ? "border-zinc-500 bg-zinc-800/80" : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700")}>
                  <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-zinc-100">{item.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.goal}</p></div><span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">{item.difficulty}</span></div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Scenario brief</p>
            <h2 className="mt-3 text-lg font-semibold text-zinc-100">{selectedScenario.customerName}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{selectedScenario.customerProfile}</p>
            <dl className="mt-6 space-y-3 border-t border-zinc-800 pt-4 text-xs"><div className="flex justify-between gap-4"><dt className="text-zinc-500">Product</dt><dd className="text-zinc-200">{selectedScenario.productName}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Personality</dt><dd className="text-zinc-200">{selectedScenario.personality}</dd></div><div className="flex justify-between gap-4"><dt className="text-zinc-500">Evaluation</dt><dd className="text-zinc-200">Structure, objections, guardrails, close</dd></div></dl>
            <button onClick={startScenario} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white">Start training call <ChevronRight className="h-4 w-4" /></button>
          </div>
        </section>
      )}

      {stage === "in_progress" && (
        <section className="space-y-5">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-zinc-100">{selectedScenario.title}</p><p className="text-xs text-zinc-500">Scenario customer · no production write</p></div><button onClick={() => finishScenario()} className="text-xs text-zinc-400 hover:text-zinc-100">End simulation</button></div>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
              <div className="space-y-4">{messages.map((message) => <div key={message.id} className={cn("max-w-2xl rounded-2xl border px-4 py-3 text-sm leading-6", message.speaker === "customer" ? "border-zinc-700 bg-zinc-800/70 text-zinc-200" : "ml-auto border-emerald-900/60 bg-emerald-950/30 text-emerald-100")}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{message.speaker === "customer" ? selectedScenario.customerName : "Operator"}</p>{message.text}</div>)}</div>
              <div className="mt-6 border-t border-zinc-800 pt-5"><p className="mb-3 text-xs font-semibold text-zinc-300">Customer response controls <span className="font-normal text-zinc-500">— deterministic scenario</span></p><div className="grid gap-2 sm:grid-cols-2">{nextResponses.map((response) => <button key={response.id} onClick={() => sendResponse(response.label, response.intent)} className="rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100">{response.label}</button>)}</div><div className="mt-4 flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendResponse(input); }} placeholder="Type your own operator response…" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600" /><button onClick={() => sendResponse(input)} className="rounded-xl bg-zinc-100 px-3 text-zinc-900 hover:bg-white" aria-label="Send response"><Send className="h-4 w-4" /></button></div></div>
            </div>
            <aside className="space-y-4"><div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Operator focus</p><p className="mt-3 text-sm leading-6 text-zinc-300">{selectedScenario.goal}</p></div><div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-amber-300"><CircleAlert className="h-4 w-4" /> Guardrails</div><p className="mt-3 text-xs leading-5 text-amber-100/70">Use approved product information. Do not promise a cure, guaranteed result, invented discount, or unclear “free” offer.</p></div></aside>
          </div>
        </section>
      )}

      {stage === "complete" && scorecard && (
        <section className="space-y-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Training report</p><h2 className="mt-2 text-2xl font-semibold text-zinc-100">{scorecard.overallScore}/100 <span className="text-zinc-500">· Grade {scorecard.grade}</span></h2></div><button onClick={() => { setStage("setup"); setMessages([]); }} className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"><RotateCcw className="h-4 w-4" /> Choose another scenario</button></div><div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5"><p className="text-sm font-semibold text-zinc-100">Dimension scores</p><div className="mt-4 space-y-4">{scorecard.dimensions.map((dimension) => <div key={dimension.label}><div className="mb-1 flex justify-between text-xs"><span className="text-zinc-300">{dimension.label}</span><span className="text-zinc-400">{dimension.score}</span></div><div className="h-1.5 rounded-full bg-zinc-800"><div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${dimension.score}%` }} /></div><p className="mt-1 text-xs text-zinc-500">{dimension.note}</p></div>)}</div></div><div className="space-y-5"><div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5"><p className="text-sm font-semibold text-zinc-100">Coach summary</p><p className="mt-3 text-sm leading-6 text-zinc-400">{scorecard.summary}</p><div className="mt-4 space-y-2 text-xs">{scorecard.strengths.map((strength) => <p key={strength} className="flex gap-2 text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{strength}</p>)}{scorecard.improvements.map((improvement) => <p key={improvement} className="flex gap-2 text-amber-200"><ArrowLeft className="mt-0.5 h-4 w-4 shrink-0" />{improvement}</p>)}</div></div><button onClick={startScenario} className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-white">Repeat this scenario <RotateCcw className="h-4 w-4" /></button></div></div><p className="text-xs text-zinc-600">This report is session-only in this MVP. It is not stored as a call, order, lead activity, KPI, or manager performance record.</p></section>
      )}
    </div>
  );
}
