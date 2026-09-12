"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, PhoneOff, PhoneOutgoing, Play, Send, ShieldAlert, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { submitTrainingTurnAction } from "@/app/actions/training";
import { saveTrainingSessionAction } from "@/app/actions/trainingSession";
import { listTrainingCallLogRecordsAction } from "@/app/actions/crm";
import { P2_TRAINING_SCRIPTS, TRAINING_PERSONAS, evaluateTrainingSession, getTrainingScenario, personaliseTrainingScript, type TrainingDifficulty, type TrainingMessage, type TrainingScorecard } from "@/lib/training";
import { speakText, stopSpeaking } from "@/lib/speechSynthesis";

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function durationLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TrainingPage() {
  const [scriptId, setScriptId] = useState(P2_TRAINING_SCRIPTS[0].id);
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>("easy");
  const [personaId, setPersonaId] = useState(TRAINING_PERSONAS[0].id);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completionKey, setCompletionKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aiSource, setAiSource] = useState<"gemini-flash" | "openai-responses" | "rule-engine" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<TrainingScorecard | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "unavailable">("idle");
  const [history, setHistory] = useState<Array<{ sessionId: string; customerName: string; durationSeconds: number; createdAt: string; scorecard: unknown }>>([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const elapsedRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const scenario = useMemo(() => getTrainingScenario(scriptId, difficulty, personaId), [scriptId, difficulty, personaId]);
  const isActive = Boolean(startedAt && !result);

  useEffect(() => {
    void listTrainingCallLogRecordsAction()
      .then((records) => setHistory(records.map((record) => ({ sessionId: record.sessionId, customerName: record.customerName, durationSeconds: record.durationSeconds, createdAt: record.createdAt, scorecard: record.scorecard }))))
      .catch(() => setHistoryUnavailable(true));
  }, []);

  function startTraining() {
    if (!scenario) return;
    stopSpeaking();
    const now = new Date().toISOString();
    const initial: TrainingMessage = { id: newId("customer"), sender: "ai_customer", text: scenario.initialMessage, timestamp: timeLabel(now), occurredAt: now, source: "scenario", sentiment: "neutral" };
    setStartedAt(now);
    setCompletionKey(crypto.randomUUID());
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setMessages([initial]);
    setResult(null);
    setSaveState("idle");
    setNotice("Jde o tréninkový hovor. Nevznikne objednávka, callback ani zásah do ostré fronty.");
    speakText(initial.text);
  }

  async function sendTurn() {
    if (!scenario || !isActive || isSending || !input.trim()) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);
    setNotice(null);
    try {
      const response = await submitTrainingTurnAction({ scriptId, difficulty, personaId, history: messages, userMessage: text, source: "typed" });
      if (!response.ok) {
        setNotice(response.message);
        setInput(text);
        return;
      }
      const now = new Date().toISOString();
      const operator: TrainingMessage = { id: newId("operator"), sender: "user", text: response.operatorTurn.text, timestamp: timeLabel(now), occurredAt: now, source: response.operatorTurn.source, confidence: response.operatorTurn.confidence };
      const customerAt = new Date().toISOString();
      const customer: TrainingMessage = { id: newId("customer"), sender: "ai_customer", text: response.customerTurn.text, timestamp: timeLabel(customerAt), occurredAt: customerAt, source: "ai_customer", sentiment: response.customerTurn.sentiment };
      elapsedRef.current += 25;
      setElapsedSeconds(elapsedRef.current);
      setMessages((current) => [...current, operator, customer]);
      setAiSource(response.customerTurn.aiSource);
      setNotice(response.customerTurn.aiNotice || null);
      speakText(customer.text);
    } finally {
      setIsSending(false);
    }
  }

  async function finishTraining() {
    if (!scenario || !startedAt || !completionKey || isSending) return;
    stopSpeaking();
    const scorecard = evaluateTrainingSession(scenario, messages);
    setResult(scorecard);
    setSaveState("saving");
    const save = await saveTrainingSessionAction({ scriptId, difficulty, personaId, messages, scorecard, durationSeconds: elapsedRef.current, aiSource, startedAt, completionKey });
    setSaveState(save.ok ? "saved" : save.code === "UNAVAILABLE" ? "unavailable" : "error");
    if (save.ok) {
      setHistory((current) => [{ sessionId: save.sessionId, customerName: `${scenario.customer.name} · trénink`, durationSeconds: elapsedRef.current, createdAt: new Date().toISOString(), scorecard }, ...current]);
    }
  }

  function resetTraining() {
    stopSpeaking();
    setStartedAt(null);
    setMessages([]);
    setResult(null);
    setNotice(null);
    setSaveState("idle");
    setInput("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={PhoneOutgoing} title="Trenažér P2" badge={{ label: "Interní pilot", tone: "neutral" }} description="Bezpečný nácvik prvního P2 hovoru s AI zákazníkem. Trénink nikdy nevytváří objednávku ani ostrý pracovní úkol." />

      {!isActive && !result && <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-zinc-100">Moje poslední tréninky</h2><p className="mt-1 text-xs text-zinc-500">Pouze vaše cvičné hovory. Obchodní výsledky ani ostré hovory se sem nemíchají.</p></div><ClipboardList className="h-5 w-5 text-zinc-500" /></div>{historyUnavailable ? <p className="mt-4 text-xs text-zinc-500">Historii tréninků se nyní nepodařilo načíst.</p> : history.length === 0 ? <p className="mt-4 text-xs text-zinc-500">Zatím jste neměl/a žádný dokončený trénink.</p> : <div className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">{history.slice(0, 5).map((entry) => { const score = entry.scorecard && typeof entry.scorecard === "object" ? entry.scorecard as { overallScore?: number; passed?: boolean; complianceScore?: number } : {}; return <div key={entry.sessionId} className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[1fr_auto_auto]"><div><p className="font-medium text-zinc-200">{entry.customerName}</p><p className="mt-1 text-zinc-500">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))} · {durationLabel(entry.durationSeconds)}</p></div><span className={`self-center rounded border px-2 py-1 text-[11px] ${score.passed ? "border-emerald-900/70 bg-emerald-950/30 text-emerald-200" : "border-amber-900/70 bg-amber-950/30 text-amber-200"}`}>{score.passed ? "Splněno" : "K opravě"}</span><span className="self-center font-mono text-zinc-300">{typeof score.overallScore === "number" ? `${score.overallScore}%` : "—"}<span className="ml-2 text-zinc-500">Compliance {typeof score.complianceScore === "number" ? `${score.complianceScore}%` : "—"}</span></span></div>})}</div>}</section>}

      {!isActive && !result && (
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-base font-semibold text-zinc-100">Vyberte cvičení</h2>
            <p className="text-sm leading-relaxed text-zinc-400">Vyberte jeden schválený P2 rozhovor a náročnost. Jméno zákazníka se bezpečně doplní do skriptu; adresu sdělí až na konci pouze jako fiktivní údaj.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {P2_TRAINING_SCRIPTS.map((script) => (
              <button key={script.id} type="button" onClick={() => setScriptId(script.id)} className={`rounded-xl border p-5 text-left transition-colors ${scriptId === script.id ? "border-sky-700 bg-sky-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}>
                <span className="text-xs font-semibold text-zinc-100">{script.title}</span>
                <span className="mt-1 block text-xs text-zinc-400">{script.productLabel}</span>
                <span className="mt-3 block text-xs leading-relaxed text-zinc-500">{script.purpose}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs font-medium text-zinc-300">Náročnost
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TrainingDifficulty)} className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600">
                <option value="easy">Snadná · zákazník vede k nabídce</option>
                <option value="standard">Standardní · jedna přirozená otázka navíc</option>
              </select>
            </label>
            <label className="space-y-2 text-xs font-medium text-zinc-300">Fiktivní zákazník
              <select value={personaId} onChange={(event) => setPersonaId(event.target.value)} className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600">
                {TRAINING_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
              </select>
            </label>
          </div>
          <button type="button" onClick={startTraining} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"><Play className="h-4 w-4 fill-current" />Spustit cvičný hovor</button>
        </section>
      )}

      {isActive && scenario && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div><h2 className="font-semibold text-zinc-100">Hovor s: {scenario.customer.name}</h2><p className="mt-1 text-xs text-zinc-500">{scenario.title} · {difficulty === "easy" ? "snadná" : "standardní"} obtížnost</p></div>
              <span className="font-mono text-sm text-zinc-400">{durationLabel(elapsedSeconds)}</span>
            </div>
            <div className="min-h-[420px] space-y-4 p-5">
              {messages.map((message) => <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl border p-3 ${message.sender === "user" ? "border-sky-900/70 bg-sky-950/30 text-sky-50" : "border-zinc-800 bg-zinc-950 text-zinc-200"}`}><div className="mb-1 flex gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500"><span>{message.sender === "user" ? "Operátor" : scenario.customer.name}</span><span>{message.timestamp}</span>{message.sender === "ai_customer" && <button type="button" onClick={() => speakText(message.text)} className="ml-auto text-zinc-400 hover:text-zinc-100" aria-label="Přečíst odpověď"><Volume2 className="h-3.5 w-3.5" /></button>}</div><p className="text-sm leading-relaxed">{message.text}</p></div></div>)}
              {isSending && <p className="text-xs text-zinc-500">AI zákazník odpovídá…</p>}
            </div>
            <div className="border-t border-zinc-800 p-4"><div className="flex gap-3"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendTurn(); } }} placeholder="Napište, co byste zákazníkovi řekl/a…" className="min-h-20 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600" /><button type="button" onClick={() => void sendTurn()} disabled={isSending || !input.trim()} className="inline-flex self-end items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Odeslat</button></div><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-zinc-500">Enter odešle · Shift+Enter nový řádek</span><button type="button" onClick={() => void finishTraining()} disabled={isSending || messages.length < 3} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><PhoneOff className="h-4 w-4" />Ukončit a vyhodnotit</button></div></div>
          </section>
          <aside className="space-y-4"><section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-400" /><h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Skript pro tento hovor</h2></div><div className="mt-4 space-y-4">{personaliseTrainingScript(scenario).map((section) => <div key={section.title}><h3 className="text-xs font-semibold text-zinc-200">{section.title}</h3><p className="mt-1 text-xs leading-relaxed text-zinc-400">{section.text}</p></div>)}</div></section><section className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" /><h2 className="text-xs font-semibold text-amber-200">Bezpečná hranice</h2></div><p className="mt-2 text-xs leading-relaxed text-amber-100/70">Neslibujte účinek, negarantujte výsledek a nevydávejte se za lékaře. Jedna chyba nezmění reakci zákazníka, ale objeví se ve výsledku hovoru.</p></section>{notice && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">{notice}</p>}</aside>
        </div>
      )}

      {result && scenario && <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6"><div className="text-center"><div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${result.passed ? "bg-emerald-950/40 text-emerald-300" : "bg-amber-950/40 text-amber-300"}`}>{result.passed ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}</div><h2 className="mt-3 text-lg font-semibold text-zinc-100">{result.passed ? "Cvičení splněno" : "Cvičení potřebuje opravu"}</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{result.summaryFeedback}</p></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Celkem", result.overallScore], ["Zjištění", result.discoveryScore], ["Nabídka", result.offerScore], ["Závěr", result.closingScore], ["Compliance", result.complianceScore]].map(([label, score]) => <div key={String(label)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center"><span className="block font-mono text-lg text-zinc-100">{score}%</span><span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span></div>)}</div>{result.complianceFindings.length > 0 && <div className="mt-6 space-y-3 rounded-xl border border-rose-900/60 bg-rose-950/20 p-5"><h3 className="flex items-center gap-2 text-sm font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Závažné právní chyby</h3>{result.complianceFindings.map((finding) => <div key={`${finding.phrase}-${finding.reason}`} className="text-xs leading-relaxed text-rose-100/80"><p><strong>Řečená věta:</strong> „{finding.phrase}“{finding.occurrences > 1 ? ` · ${finding.occurrences}×` : ""}</p><p className="mt-1"><strong>Proč:</strong> {finding.reason}</p><p className="mt-1"><strong>Bezpečněji:</strong> {finding.saferAlternative}</p></div>)}</div>}<div className="mt-6 grid gap-4 md:grid-cols-2"><div><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Co se povedlo</h3><ul className="mt-3 space-y-2 text-sm text-zinc-400">{result.strengths.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Další pokus zlepší</h3><ul className="mt-3 space-y-2 text-sm text-zinc-400">{result.improvements.map((item) => <li key={item}>• {item}</li>)}</ul></div></div><p className="mt-6 text-center text-xs text-zinc-500">{saveState === "saving" && "Ukládám přepis pro kontrolu vedoucího…"}{saveState === "saved" && "Tréninkový přepis byl uložen do historie jako jasně označený tréninkový záznam."}{saveState === "unavailable" && "V demo režimu se přepis neukládá."}{saveState === "error" && "Výsledek zůstal zobrazený, ale přepis se nepodařilo uložit."}</p><div className="mt-6 flex justify-center"><button type="button" onClick={resetTraining} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"><ClipboardList className="h-4 w-4" />Vybrat další cvičení</button></div></section>}
    </div>
  );
}
