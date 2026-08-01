"use client";

import { useState, useRef, useEffect } from "react";
import {
  TRAINING_SCENARIOS,
  TrainingScenario,
  TrainingMessage,
  TrainingScorecard,
  generateAICustomerResponse,
  evaluateTrainingSession,
} from "@/lib/training";
import { addOperatorXp, unlockAchievement } from "@/lib/gamification";
import { checkCompliance, ComplianceViolation } from "@/lib/compliance";
import {
  GraduationCap,
  Play,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrainingPage() {
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [scorecard, setScorecard] = useState<TrainingScorecard | null>(null);
  const [activeViolations, setActiveViolations] = useState<ComplianceViolation[]>([]);
  const [earnedXpToast, setEarnedXpToast] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotThinking]);

  const handleStartScenario = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setScorecard(null);
    setActiveViolations([]);
    setEarnedXpToast(null);

    const initialMsg: TrainingMessage = {
      id: "msg_init",
      sender: "ai_customer",
      text: scenario.initialMessage,
      timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      sentiment: "neutral",
    };

    setMessages([initialMsg]);
    setIsSimulating(true);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedScenario || isBotThinking) return;

    const userText = inputText.trim();
    setInputText("");

    // Check compliance
    const violations = checkCompliance(userText, selectedScenario.category);
    if (violations.length > 0) {
      setActiveViolations((prev) => [...violations, ...prev]);
    }

    const userMsg: TrainingMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsBotThinking(true);

    try {
      const aiResponse = await generateAICustomerResponse(selectedScenario, newHistory, userText);

      const botMsg: TrainingMessage = {
        id: `ai_${Date.now()}`,
        sender: "ai_customer",
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        sentiment: aiResponse.sentiment,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBotThinking(false);
    }
  };

  const handleToggleMic = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Váš prohlížeč nepodporuje hlasové rozpoznávání Web Speech API.");
      return;
    }

    try {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.lang = "cs-CZ";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleFinishTraining = () => {
    if (!selectedScenario) return;

    const evaluation = evaluateTrainingSession(selectedScenario, messages);
    setScorecard(evaluation);
    setIsSimulating(false);

    // Award XP
    addOperatorXp(evaluation.xpEarned, `Training completion: ${selectedScenario.title}`);
    setEarnedXpToast(evaluation.xpEarned);

    if (evaluation.grade === "A+" || evaluation.grade === "A") {
      unlockAchievement("training_champion");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-indigo-950/40 border border-purple-800/30 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              AI Call Roleplay Simulator
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono">
                Training Mode
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Trénuj simulované hovory s AI boti reprezentujícími různé zákaznické typy bez rizika ztráty obchodu.
            </p>
          </div>
        </div>

        {earnedXpToast && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-bounce">
            <Zap className="w-5 h-5 fill-emerald-400" />
            <span className="text-sm font-bold">+{earnedXpToast} XP Získáváte!</span>
          </div>
        )}
      </div>

      {!selectedScenario || (!isSimulating && !scorecard) ? (
        /* Scenario Selection Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Vyberte Tréninkový Scénář
            </h2>
            <span className="text-xs text-zinc-500">Dostupné scenáře: {TRAINING_SCENARIOS.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TRAINING_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className="group relative flex flex-col justify-between p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 transition-all shadow-lg overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                        scenario.difficulty === "Snadná"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : scenario.difficulty === "Střední"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      )}
                    >
                      {scenario.difficulty}
                    </span>
                    <span className="text-[11px] text-purple-400 font-medium">
                      {scenario.personalityType}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">
                    {scenario.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-300">Zákazník:</strong> {scenario.customerName}
                    <br />
                    <span className="italic text-zinc-400">"{scenario.customerPersona}"</span>
                  </p>

                  <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                    <span className="text-[11px] font-medium text-zinc-400">Cíle hovoru:</span>
                    <ul className="text-[11px] text-zinc-400 space-y-1">
                      {scenario.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => handleStartScenario(scenario)}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all group-hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Spustit Trénink
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : isSimulating && selectedScenario ? (
        /* Active Roleplay Session */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center Chat & Voice Box */}
          <div className="lg:col-span-2 flex flex-col h-[650px] bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Session Top Bar */}
            <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">{selectedScenario.customerName}</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    AI Zákazník • {selectedScenario.personalityType}
                  </span>
                </div>
              </div>

              <button
                onClick={handleFinishTraining}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Ukončit & Vyhodnotit
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 font-bold",
                      msg.sender === "user"
                        ? "bg-zinc-800 border border-zinc-700 text-zinc-200"
                        : "bg-purple-950 border border-purple-700 text-purple-300"
                    )}
                  >
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl text-xs space-y-1 leading-relaxed shadow-md",
                      msg.sender === "user"
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 rounded-tl-none"
                    )}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={cn(
                        "text-[9px] block text-right font-mono",
                        msg.sender === "user" ? "text-purple-200" : "text-zinc-400"
                      )}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isBotThinking && (
                <div className="flex items-center gap-2 text-xs text-purple-400 italic bg-purple-950/30 border border-purple-800/30 p-3 rounded-xl w-fit animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  AI Zákazník přemýšlí nad odpovědí...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Controls & Speech Recognition */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMic}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all shrink-0",
                    isRecording
                      ? "bg-rose-600 text-white border-rose-500 animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.5)]"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-zinc-100 hover:bg-zinc-700"
                  )}
                  title={isRecording ? "Zastavit hlasový přepis" : "Mluvit (Web Speech API)"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={
                    isRecording
                      ? "Mluvte... řeč se automaticky přepisuje..."
                      : "Napište odpověď zákazníkovi nebo použijte mikrofon..."
                  }
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isBotThinking}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all shadow-md shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Scenario Guidelines & Realtime Compliance Monitor */}
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Scénář & Cíle Hovorů
              </h3>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-[11px] font-semibold text-purple-300">{selectedScenario.title}</span>
                <p className="text-[11px] text-zinc-400">{selectedScenario.customerPersona}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-zinc-300">Cíle ke splnění:</span>
                <div className="space-y-1.5">
                  {selectedScenario.goals.map((g, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800 text-[11px] text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Compliance Checker Alerts */}
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Zákonný Hlídač (Compliance Monitor)
              </h3>

              {activeViolations.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Zatím nebylo detekováno žádné legislativní porušení.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeViolations.map((v, i) => (
                    <div key={i} className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {v.rule.title}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">{v.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-zinc-300">{v.rule.explanation}</p>
                      <div className="pt-1 text-[10px] text-amber-300 italic">
                        💡 Doporučení: {v.rule.correctionSuggestion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : scorecard && selectedScenario ? (
        /* Evaluation Scorecard Results */
        <div className="p-8 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-2">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-zinc-100">Výsledný Scorecard Tréninku</h2>
            <p className="text-xs text-zinc-400">Scénář: {selectedScenario.title}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-3xl font-black text-purple-400">{scorecard.grade}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-semibold">Známka</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-3xl font-black text-emerald-400">{scorecard.overallScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-semibold">Celkové Skóre</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-3xl font-black text-amber-400">{scorecard.complianceScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-semibold">Compliance</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-3xl font-black text-indigo-400">+{scorecard.xpEarned}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-semibold">XP Získané</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Silné stránky
              </h4>
              <ul className="text-xs text-zinc-300 space-y-2">
                {scorecard.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Příležitosti ke zlepšení
              </h4>
              <ul className="text-xs text-zinc-300 space-y-2">
                {scorecard.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200 leading-relaxed">
            <strong className="text-purple-300 font-semibold block mb-1">AI Závěrečné Hodnocení:</strong>
            {scorecard.summaryFeedback}
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setScorecard(null);
                setSelectedScenario(null);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Vybrat Jiný Scénář
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
