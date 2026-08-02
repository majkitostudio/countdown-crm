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
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              AI Call Roleplay Simulator
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                Training Mode
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Trénuj simulované hovory s AI boti reprezentujícími různé zákaznické typy bez rizika ztráty obchodu.
            </p>
          </div>
        </div>

        {earnedXpToast && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-medium animate-bounce">
            <Zap className="w-4 h-4 fill-emerald-400" />
            <span>+{earnedXpToast} XP Získáváte!</span>
          </div>
        )}
      </div>

      {!selectedScenario || (!isSimulating && !scorecard) ? (
        /* Scenario Selection Grid */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              Vyberte Tréninkový Scénář
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Dostupné scenáře: {TRAINING_SCENARIOS.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRAINING_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                className="group flex flex-col justify-between p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 backdrop-blur-md transition-all shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium border",
                        scenario.difficulty === "Snadná"
                          ? "bg-emerald-950/80 border-emerald-800/60 text-emerald-400"
                          : scenario.difficulty === "Střední"
                          ? "bg-amber-950/80 border-amber-800/60 text-amber-400"
                          : "bg-rose-950/80 border-rose-800/60 text-rose-400"
                      )}
                    >
                      {scenario.difficulty}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {scenario.personalityType}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-zinc-200 transition-colors">
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
                          <CheckCircle2 className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => handleStartScenario(scenario)}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-medium transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
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
          <div className="lg:col-span-2 flex flex-col h-[650px] bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden">
            {/* Session Top Bar */}
            <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">{selectedScenario.customerName}</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    AI Zákazník • {selectedScenario.personalityType}
                  </span>
                </div>
              </div>

              <button
                onClick={handleFinishTraining}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-medium transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
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
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-medium",
                      msg.sender === "user"
                        ? "bg-zinc-800 border border-zinc-700 text-zinc-200"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-300"
                    )}
                  >
                    {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={cn(
                      "p-3 rounded-xl text-xs space-y-1 leading-relaxed shadow-xs",
                      msg.sender === "user"
                        ? "bg-zinc-100 text-zinc-950 font-medium rounded-tr-none"
                        : "bg-zinc-900/80 text-zinc-200 border border-zinc-800 rounded-tl-none"
                    )}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={cn(
                        "text-[9px] block text-right font-mono",
                        msg.sender === "user" ? "text-zinc-500" : "text-zinc-400"
                      )}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {isBotThinking && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 italic bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl w-fit animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  AI Zákazník přemýšlí nad odpovědí...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Controls & Speech Recognition */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMic}
                  className={cn(
                    "p-2 rounded-lg border transition-all shrink-0",
                    isRecording
                      ? "bg-rose-950/80 text-rose-400 border-rose-800/80 animate-pulse"
                      : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:border-zinc-700"
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
                  className="flex-1 bg-zinc-900/90 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 transition-colors"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isBotThinking}
                  className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Scenario Guidelines & Realtime Compliance Monitor */}
          <div className="space-y-5">
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-4">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-400" />
                Scénář & Cíle Hovorů
              </h3>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                <span className="text-xs font-semibold text-zinc-200">{selectedScenario.title}</span>
                <p className="text-[11px] text-zinc-400">{selectedScenario.customerPersona}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-medium text-zinc-300">Cíle ke splnění:</span>
                <div className="space-y-1.5">
                  {selectedScenario.goals.map((g, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Compliance Checker Alerts */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Zákonný Hlídač (Compliance Monitor)
              </h3>

              {activeViolations.length === 0 ? (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Zatím nebylo detekováno žádné legislativní porušení.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeViolations.map((v, i) => (
                    <div key={i} className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-medium">
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
        <div className="p-8 rounded-xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 mb-1">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">Výsledný Scorecard Tréninku</h2>
            <p className="text-xs text-zinc-400">Scénář: {selectedScenario.title}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold text-zinc-100">{scorecard.grade}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Známka</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold text-emerald-400">{scorecard.overallScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Celkové Skóre</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold text-amber-400">{scorecard.complianceScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Compliance</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold text-zinc-200">+{scorecard.xpEarned}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">XP Získané</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
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

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
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

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
            <strong className="text-zinc-200 font-semibold block mb-1">AI Závěrečné Hodnocení:</strong>
            {scorecard.summaryFeedback}
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => {
                setScorecard(null);
                setSelectedScenario(null);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-medium transition-colors shadow-sm"
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
