"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, FileText, LoaderCircle, Mic, MicOff, PhoneOff, PhoneOutgoing, Play, Send, ShieldAlert, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { submitTrainingTurnAction } from "@/app/actions/training";
import { saveTrainingSessionAction } from "@/app/actions/trainingSession";
import { generateTrainingFeedbackAction } from "@/app/actions/trainingFeedback";
import { listTrainingCallLogRecordsAction } from "@/app/actions/crm";
import { P2_TRAINING_SCRIPTS, TRAINING_PERSONAS, getTrainingScenario, personaliseTrainingScript, type TrainingDifficulty, type TrainingMessage, type TrainingFeedback } from "@/lib/training";
import { speakText, stopSpeaking } from "@/lib/speechSynthesis";
import { createContinuousSpeechRecognition, isBrowserSpeechRecognitionSupported, type BrowserSpeechRecognitionErrorEvent, type ContinuousSpeechRecognition } from "@/lib/speechRecognition";

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
  const [result, setResult] = useState<TrainingFeedback[] | null>(null);
  const [, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "unavailable">("idle");
  const [history, setHistory] = useState<Array<{ sessionId: string; customerName: string; durationSeconds: number; createdAt: string; feedback: TrainingFeedback[] }>>([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const elapsedRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
const continuousRecognitionRef = useRef<ContinuousSpeechRecognition | null>(null);
  const speechFinalRef = useRef("");
  const speechConfidenceRef = useRef<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [speechStatus, setSpeechStatus] = useState<"idle" | "listening" | "processing" | "ready" | "error" | "unsupported">("idle");
  const [speechInterim, setSpeechInterim] = useState("");
  const [inputSource, setInputSource] = useState<"typed" | "browser_speech">("typed");

  const scenario = useMemo(() => getTrainingScenario(scriptId, difficulty, personaId), [scriptId, difficulty, personaId]);
  const isActive = Boolean(startedAt && !result);

  useEffect(() => {
    void listTrainingCallLogRecordsAction()
      .then((records) => setHistory(records.map((record) => ({ sessionId: record.sessionId, customerName: record.customerName, durationSeconds: record.durationSeconds, createdAt: record.createdAt, feedback: (record.feedback as TrainingFeedback[] | undefined) || [] }))))
      .catch(() => setHistoryUnavailable(true));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSpeechSupported(isBrowserSpeechRecognitionSupported()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!startedAt || result) return;

    const updateElapsed = () => {
      const startedAtMs = Date.parse(startedAt);
      const seconds = Number.isFinite(startedAtMs) ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0;
      elapsedRef.current = seconds;
      setElapsedSeconds(seconds);
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, result]);

  useEffect(() => () => {
    continuousRecognitionRef.current?.abort();
    continuousRecognitionRef.current = null;
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
    setSpeechStatus("idle");
    setSpeechInterim("");
    setInputSource("typed");
    speechFinalRef.current = "";
    speechConfidenceRef.current = null;
    setNotice("Jde o tréninkový hovor. Nevznikne objednávka, callback ani zásah do ostré fronty.");
    speakText(initial.text);
  }

  async function sendTurn() {
    if (!scenario || !isActive || isSending || speechStatus === "listening" || speechStatus === "processing" || !input.trim()) return;
    const text = input.trim();
    const source = inputSource;
    const confidence = source === "browser_speech" ? speechConfidenceRef.current : null;
    setInput("");
    setIsSending(true);
    setNotice(null);
    try {
      const response = await submitTrainingTurnAction({ scriptId, difficulty, personaId, history: messages, userMessage: text, source, confidence });
      if (!response.ok) {
        setNotice(response.message);
        setInput(text);
        return;
      }
      const now = new Date().toISOString();
      const operator: TrainingMessage = { id: newId("operator"), sender: "user", text: response.operatorTurn.text, timestamp: timeLabel(now), occurredAt: now, source: response.operatorTurn.source, confidence: response.operatorTurn.confidence };
      const customerAt = new Date().toISOString();
      const customer: TrainingMessage = { id: newId("customer"), sender: "ai_customer", text: response.customerTurn.text, timestamp: timeLabel(customerAt), occurredAt: customerAt, source: "ai_customer", sentiment: response.customerTurn.sentiment };
      setMessages((current) => [...current, operator, customer]);
      setInputSource("typed");
      speechFinalRef.current = "";
      speechConfidenceRef.current = null;
      setSpeechInterim("");
      setSpeechStatus("idle");
      setAiSource(response.customerTurn.aiSource);
      setNotice(response.customerTurn.aiNotice || null);
      speakText(customer.text);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Odpověď AI zákazníka není nyní dostupná.");
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }

  async function finishTraining() {
    if (!scenario || !startedAt || !completionKey || isSending || speechStatus === "listening" || speechStatus === "processing") return;
    stopSpeaking();
    const feedbackResult = await generateTrainingFeedbackAction({ scriptId, difficulty, personaId, history: messages });
    if (!feedbackResult.ok) {
      setNotice(feedbackResult.message);
      return;
    }
    const completedDuration = elapsedRef.current;
    setResult(feedbackResult.feedback);
    setSaveState("saving");
    try {
      const save = await saveTrainingSessionAction({ scriptId, difficulty, personaId, messages, feedback: feedbackResult.feedback, durationSeconds: completedDuration, aiSource, startedAt, completionKey });
      setSaveState(save.ok ? "saved" : save.code === "UNAVAILABLE" ? "unavailable" : "error");
      if (save.ok) {
        setHistory((current) => [{ sessionId: save.sessionId, customerName: `${scenario.customer.name} · trénink`, durationSeconds: completedDuration, createdAt: new Date().toISOString(), feedback: feedbackResult.feedback }, ...current]);
      }
    } catch (error) {
      setSaveState("error");
      setNotice(error instanceof Error ? error.message : "Výsledek se nepodařilo uložit.");
    }
  }

function stopListening() {
    if (speechStatus !== "listening") return;
    setSpeechStatus("processing");
    continuousRecognitionRef.current?.stop();
  }

  function startListening() {
    if (!isActive || isSending || speechStatus === "listening" || speechStatus === "processing") return;
    if (speechSupported !== true) {
      setSpeechStatus("unsupported");
      setNotice("Tento prohlížeč nepodporuje browserový přepis. Můžete pokračovat psaním.");
      return;
    }

    speechFinalRef.current = "";
    speechConfidenceRef.current = null;
    setSpeechInterim("");
    setSpeechStatus("listening");
    setNotice("Mluvte česky. Přepis běží nepřetržitě – můžete psát i mluvit současně. Klikněte 'Zastavit přepis' pro ukončení.");

    const continuous = createContinuousSpeechRecognition({
      language: "cs-CZ",
      onStart: () => setSpeechStatus("listening"),
      onInterimResult: (transcript) => {
        setSpeechInterim(transcript);
      },
      onFinalResult: (transcript, confidence) => {
        speechFinalRef.current = `${speechFinalRef.current} ${transcript}`.trim();
        if (confidence !== null) speechConfidenceRef.current = confidence;
        setInput(speechFinalRef.current);
        setInputSource("browser_speech");
        setSpeechInterim("");
      },
      onError: (event: BrowserSpeechRecognitionErrorEvent) => {
        if (event.error === "aborted") return;
        setSpeechStatus("error");
        setNotice(event.error === "not-allowed"
          ? "Přístup k mikrofonu nebyl povolen. Můžete pokračovat psaním."
          : "Browserový přepis se nepodařilo dokončit. Zkuste to znovu nebo pokračujte psaním.");
      },
      onEnd: () => {
        // Continuous recognition auto-restarts, onEnd only fires when stopped/aborted
        setSpeechInterim("");
        if (speechFinalRef.current) {
          setInput(speechFinalRef.current);
          setInputSource("browser_speech");
          setSpeechStatus("ready");
        } else {
          setSpeechStatus("idle");
        }
      },
    });

    if (!continuous) {
      setSpeechStatus("unsupported");
      setNotice("Tento prohlížeč nepodporuje browserový přepis. Můžete pokračovat psaním.");
      return;
    }

    continuousRecognitionRef.current = continuous;
    continuous.start();
  }

  function resetTraining() {
    stopSpeaking();
    continuousRecognitionRef.current?.abort();
    continuousRecognitionRef.current = null;
    setSpeechStatus("idle");
    setSpeechInterim("");
    setStartedAt(null);
    setMessages([]);
    setResult(null);
    setNotice(null);
    setSaveState("idle");
    setInput("");
    setInputSource("typed");
    speechFinalRef.current = "";
    speechConfidenceRef.current = null;
  }

  function updateInput(value: string) {
    setInput(value);
    if (speechStatus !== "listening" && speechStatus !== "processing") setInputSource("typed");
  }

  const speechBusy = speechStatus === "listening" || speechStatus === "processing";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader icon={PhoneOutgoing} title="Trenažér P2" badge={{ label: "Interní pilot", tone: "neutral" }} description="Bezpečný nácvik prvního P2 hovoru s AI zákazníkem. Trénink nikdy nevytváří objednávku ani ostrý pracovní úkol." />

      {!isActive && !result && <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-zinc-100">Moje poslední tréninky</h2><p className="mt-1 text-xs text-zinc-500">Pouze vaše cvičné hovory. Obchodní výsledky ani ostré hovory se sem nemíchají.</p></div><ClipboardList className="h-5 w-5 text-zinc-500" /></div>{historyUnavailable ? <p className="mt-4 text-xs text-zinc-500">Historii tréninků se nyní nepodařilo načíst.</p> : history.length === 0 ? <p className="mt-4 text-xs text-zinc-500">Zatím jste neměl/a žádný dokončený trénink.</p> : <div className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">{history.slice(0, 5).map((entry) => { const fb = entry.feedback; const hasCritical = fb.some((f) => f.severity === "critical"); return <div key={entry.sessionId} className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[1fr_auto_auto]"><div><p className="font-medium text-zinc-200">{entry.customerName}</p><p className="mt-1 text-zinc-500">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))} · {durationLabel(entry.durationSeconds)}</p></div><span className={`self-center rounded border px-2 py-1 text-[11px] ${hasCritical ? "border-amber-900/70 bg-amber-950/30 text-amber-200" : fb.length > 0 ? "border-amber-900/70 bg-amber-950/30 text-amber-200" : "border-emerald-900/70 bg-emerald-950/30 text-emerald-200"}`}>{hasCritical ? "Závažné chyby" : fb.length > 0 ? "K opravě" : "Bez zásadních chyb"}</span><span className="self-center font-mono text-zinc-300">{fb.length} oprava{fb.length !== 1 ? "y" : ""}</span></div>})}</div>}</section>}

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
            <div className="min-h-105 space-y-4 p-5">
              {messages.map((message) => <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl border p-3 ${message.sender === "user" ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-200"}`}><div className="mb-1 flex gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500"><span>{message.sender === "user" ? "Operátor" : scenario.customer.name}</span><span>{message.timestamp}</span>{message.sender === "ai_customer" && <button type="button" onClick={() => speakText(message.text)} className="ml-auto text-zinc-400 hover:text-zinc-100" aria-label="Přečíst odpověď"><Volume2 className="h-3.5 w-3.5" /></button>}</div><p className="text-sm leading-relaxed">{message.text}</p></div></div>)}
              {isSending && <p className="text-xs text-zinc-500">AI zákazník odpovídá…</p>}
            </div>
            <div className="border-t border-zinc-800 p-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(event) => updateInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendTurn(); } }}
                  placeholder="Napište, co byste zákazníkovi řekl/a…"
                  className="min-h-20 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                  disabled={speechBusy}
                />
                <button type="button" onClick={() => void sendTurn()} disabled={isSending || speechBusy || !input.trim()} className="inline-flex self-end items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Odeslat</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                  <button type="button" onClick={speechStatus === "listening" ? stopListening : startListening} disabled={isSending || speechStatus === "processing" || speechSupported === false} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {speechStatus === "listening" ? <MicOff className="h-3.5 w-3.5" /> : speechStatus === "processing" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                    {speechStatus === "listening" ? "Zastavit přepis" : speechStatus === "processing" ? "Zpracovávám…" : "Mluvit místo psaní"}
                  </button>
                  <span aria-live="polite">
                    {speechSupported === false
                      ? "Browserový přepis není podporovaný"
                      : speechStatus === "ready"
                        ? "Přepis je připravený k úpravě"
                        : speechStatus === "error"
                          ? "Přepis selhal; můžete pokračovat psaním"
                          : inputSource === "browser_speech"
                            ? "Zdroj: browserový přepis"
                            : "Volitelné · audio se neukládá"}
                  </span>
                </div>
                <button type="button" onClick={() => void finishTraining()} disabled={isSending || speechBusy || messages.length < 3} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><PhoneOff className="h-4 w-4" />Ukončit a vyhodnotit</button>
              </div>
              {speechInterim && <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs italic text-zinc-500" aria-live="polite">Průběžný přepis: {speechInterim}</p>}
              <p className="mt-2 text-[11px] text-zinc-600">Enter odešle · Shift+Enter nový řádek · Mluvený text zkontrolujte před odesláním.</p>
            </div>
          </section>
          <aside className="space-y-4"><section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-zinc-400" /><h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Skript pro tento hovor</h2></div><div className="mt-4 space-y-4">{personaliseTrainingScript(scenario).map((section) => <div key={section.title}><h3 className="text-xs font-semibold text-zinc-200">{section.title}</h3><p className="mt-1 text-xs leading-relaxed text-zinc-400">{section.text}</p></div>)}</div></section><section className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-5"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" /><h2 className="text-xs font-semibold text-amber-200">Bezpečná hranice</h2></div><p className="mt-2 text-xs leading-relaxed text-amber-100/70">Neslibujte účinek, negarantujte výsledek a nevydávejte se za lékaře. Jedna chyba nezmění reakci zákazníka, ale objeví se ve výsledku hovoru.</p></section>{notice && <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">{notice}</p>}</aside>
        </div>
      )}

      {result && scenario && (() => {
        const feedbackItems = result.map((fb, idx) => {
          const borderClass = fb.severity === "critical" ? "border-rose-900/60 bg-rose-950/20" : fb.severity === "warning" ? "border-amber-900/60 bg-amber-950/20" : "border-zinc-800/60 bg-zinc-950/20";
          const badgeClass = fb.severity === "critical" ? "border-rose-900 text-rose-200" : fb.severity === "warning" ? "border-amber-900 text-amber-200" : "border-zinc-700 text-zinc-300";
          const severityLabel = fb.severity === "critical" ? "Závažné" : fb.severity === "warning" ? "Upozornění" : "Info";
          return <div key={idx} className={`rounded-xl border p-4 ${borderClass}`}><div className="flex items-start gap-2"><span className={`flex-shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>{severityLabel}</span><span className="text-xs font-medium text-zinc-300 capitalize">{fb.type}</span></div><p className="mt-2 text-xs text-zinc-400"><strong>Řekl/a jsi:</strong> „{fb.operatorText}“</p><p className="mt-1 text-xs text-emerald-300"><strong>Správně:</strong> „{fb.suggestedText}“</p><p className="mt-1 text-xs text-zinc-500"><strong>Proč:</strong> {fb.reason}</p></div>;
        });
        const noFeedback = result.length === 0 ? <p className="mt-6 text-center text-emerald-300">Bez zásadních chyb – dobrá práce.</p> : <div className="mt-6 space-y-4">{feedbackItems}</div>;
        return <section className="mx-auto max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6"><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900/50 text-zinc-300"><FileText className="h-6 w-6" /></div><h2 className="mt-3 text-lg font-semibold text-zinc-100">Co mělo znít lépe</h2><p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">AI coachingová zpětná vazba – konkrétní opravy bez bodování. Projděte si, přidejte vlastní poznámky a zkuste to znovu.</p></div>{noFeedback}<div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-sm text-zinc-400">Zavřete toto okno a zkuste to znovu, nebo pokračujte do recenze Team Leadera.</div><div className="mt-6 flex justify-center"><button type="button" onClick={resetTraining} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"><ClipboardList className="h-4 w-4" />Vybrat další cvičení</button></div></section>;
      })()}
    </div>
  );
}