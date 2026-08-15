"use client";

import { useState, useRef, useEffect } from "react";
import {
  TRAINING_SCENARIOS,
  TrainingScenario,
  TrainingMessage,
  TrainingScorecard,
  CustomerPersonalityType,
  evaluateTrainingSession,
} from "@/lib/training";
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
  Target,
  TrendingUp,
  Clock,
  PhoneCall,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { generateTrainingResponseAction } from "@/app/actions/training";
import { speakText, stopSpeaking, getPersonaVoiceSettings } from "@/lib/speechSynthesis";
import { Volume2, VolumeX, Radio } from "lucide-react";

type TrainingCallState = "idle" | "listening" | "processing" | "ai-speaking";

export default function TrainingPage() {
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [callState, setCallState] = useState<TrainingCallState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [patience, setPatience] = useState<number>(75);
  const [customerMood, setCustomerMood] = useState<string>("Skeptický");
  const [isHungUp, setIsHungUp] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<TrainingScorecard | null>(null);
  const [activeViolations, setActiveViolations] = useState<ComplianceViolation[]>([]);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);
  const [aiSource, setAiSource] = useState<"gemini-flash" | "openai-responses" | "rule-engine" | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const [activeScriptPhase, setActiveScriptPhase] = useState<number>(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const shouldSubmitRecognitionRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotThinking]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && !isHungUp) {
      interval = setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulating, isHungUp]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateWpm = (): { wpm: number; status: "optimal" | "slow" | "fast"; label: string } => {
    const userMessages = messages.filter((m) => m.sender === "user");
    const totalWords = userMessages.reduce((acc, m) => acc + m.text.split(/\s+/).filter(Boolean).length, 0);
    if (callDurationSeconds === 0 || totalWords === 0) {
      return { wpm: 140, status: "optimal", label: "140 WPM (Optimální)" };
    }
    const wpm = Math.round((totalWords / callDurationSeconds) * 60);
    if (wpm < 115) {
      return { wpm, status: "slow", label: `${wpm} WPM (Pomalé)` };
    } else if (wpm > 165) {
      return { wpm, status: "fast", label: `${wpm} WPM (Rychlé!)` };
    }
    return { wpm, status: "optimal", label: `${wpm} WPM (Optimální)` };
  };

  const playAiAudio = (text: string, scenario: TrainingScenario) => {
    if (!isVoiceModeEnabled) {
      setCallState("listening");
      return;
    }
    const voiceSettings = getPersonaVoiceSettings(scenario.personalityType);
    speakText(text, {
      ...voiceSettings,
      onStart: () => {
        setIsAiSpeaking(true);
        setCallState("ai-speaking");
      },
      onEnd: () => {
        setIsAiSpeaking(false);
        setCallState("listening");
      },
      onError: () => {
        setIsAiSpeaking(false);
        setCallState("listening");
      },
    });
  };

  const handleStartScenario = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setScorecard(null);
    setActiveViolations([]);
    setPatience(75);
    setCustomerMood(scenario.personalityType);
    setIsHungUp(false);
    setCallDurationSeconds(0);
    setCallState("listening");
    setLiveTranscript("");
    setAiSource(null);
    setAiNotice(null);

    const initialMsg: TrainingMessage = {
      id: "msg_init",
      sender: "ai_customer",
      text: scenario.initialMessage,
      timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      sentiment: "neutral",
      customerMood: scenario.personalityType as any,
      patienceGauge: 75,
    };

    setMessages([initialMsg]);
    setIsSimulating(true);
    playAiAudio(scenario.initialMessage, scenario);
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const userText = (messageOverride ?? inputText).trim();
    if (!userText || !selectedScenario || isBotThinking || isHungUp) return;

    setInputText("");
    setLiveTranscript("");
    setCallState("processing");

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
      const aiResponse = await generateTrainingResponseAction(selectedScenario, newHistory, userText);
      setAiSource(aiResponse.aiSource);
      setAiNotice(aiResponse.aiNotice || null);

      const newPatience = Math.max(0, Math.min(100, patience + (aiResponse.patienceDelta || 0)));
      setPatience(newPatience);
      if (aiResponse.customerMood) {
        setCustomerMood(aiResponse.customerMood);
      }

      const botMsg: TrainingMessage = {
        id: `ai_${Date.now()}`,
        sender: "ai_customer",
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        sentiment: aiResponse.sentiment,
        customerMood: aiResponse.customerMood,
        patienceGauge: newPatience,
      };

      if (newPatience <= 0) {
        setIsHungUp(true);
        setCallState("idle");
        const hangUpMsg: TrainingMessage = {
          id: `hangup_${Date.now()}`,
          sender: "ai_customer",
          text: "❌ Zákazník ztratil trpělivost a ukončil hovor (Hang Up)!",
          timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
          sentiment: "negative",
        };
        setMessages((prev) => [...prev, botMsg, hangUpMsg]);
        playAiAudio("Už na to nemám čas ani nervy, na shledanou!", selectedScenario);
        setTimeout(() => {
          handleFinishTraining();
        }, 2500);
        return;
      }

      setMessages((prev) => [...prev, botMsg]);
      playAiAudio(aiResponse.text, selectedScenario);
    } catch (err) {
      console.error(err);
      setCallState("listening");
    } finally {
      setIsBotThinking(false);
    }
  };

  const getTeleprompterScript = (productName: string, phase: number, personality: CustomerPersonalityType) => {
    switch (phase) {
      case 1:
        return `Dobrý den, u telefonu [Vaše Jméno] z Countdown CRM. Volám ohledně vaší poptávky na ${productName}. Máte minutku na krátké ujasnění?`;
      case 2:
        return `Děkuji. Jaké máte současné zkušenosti s tímto typem produktů a co je pro vás při výběru klíčové?`;
      case 3:
        return `Náš ${productName} vyniká špičkovou kvalitou složení, okamžitým účinkem a garantovanou liposomální vstřebatelností.`;
      case 4:
        return personality === "Cenově citlivý"
          ? `Rozumím vaší obavě z ceny. Při výhodném 3měsíčním balíčku získáte slevu 25 % a dopravu zcela zdarma.`
          : personality === "Nedůvěřivý"
          ? `Chápu vaši opatrnost. Na produkt máme oficiální certifikáty kvality a nabízíme 30denní garanci vrácení peněz bez rizika.`
          : `Rozumím vám. Nabízíme 30denní garanci spokojenosti s bezplatnou možností vrácení peněz.`;
      case 5:
        return `Můžeme zásilku ${productName} zarezervovat s doručením na zítřejší dopoledne s platbou na dobírku?`;
      default:
        return ``;
    }
  };

  const handleToggleMic = () => {
    if (isRecording) {
      shouldSubmitRecognitionRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      setCallState("listening");
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Váš prohlížeč nepodporuje hlasové rozpoznávání Web Speech API.");
      return;
    }

    try {
      if (isAiSpeaking) {
        stopSpeaking();
        setIsAiSpeaking(false);
      }

      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.lang = "cs-CZ";
      recognition.continuous = false;
      recognition.interimResults = true;

      let finalTranscript = "";
      shouldSubmitRecognitionRef.current = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsRecording(true);
        setCallState("listening");
      };
      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
        const transcriptToSubmit = finalTranscript.trim();
        setLiveTranscript("");
        if (shouldSubmitRecognitionRef.current && transcriptToSubmit) {
          void handleSendMessage(transcriptToSubmit);
        } else {
          setCallState("listening");
        }
        shouldSubmitRecognitionRef.current = false;
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        finalTranscript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        const visibleTranscript = `${finalTranscript} ${interimTranscript}`.trim();
        setLiveTranscript(visibleTranscript);
        setInputText(finalTranscript);
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
    setCallState("idle");
    shouldSubmitRecognitionRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopSpeaking();
    setIsAiSpeaking(false);

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

      </div>

      {!selectedScenario || (!isSimulating && !scorecard) ? (
        /* Scenario Selection */
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              Nebo Vyberte Přednastavený Scénář
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        scenario.difficulty === "Snadná"
                          ? "bg-emerald-500"
                          : scenario.difficulty === "Střední"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )} />
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
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
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
            <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-zinc-200">{selectedScenario.customerName}</h3>
                    
                    {/* Audio Waveform Indicator */}
                    {isAiSpeaking && (
                      <div className="flex items-center gap-1 h-3 shrink-0 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80">
                        <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3 delay-75" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-1 delay-150" />
                        <span className="text-[10px] text-emerald-400 font-mono font-medium ml-1">AI mluví</span>
                      </div>
                    )}

                    {/* Customer Mood Badge */}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1",
                      customerMood === "Nadšený" || customerMood === "Klidný"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        : customerMood === "Skeptický" || customerMood === "Nedůvěřivý"
                        ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                        : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        customerMood === "Nadšený" || customerMood === "Klidný"
                          ? "bg-emerald-400"
                          : customerMood === "Skeptický" || customerMood === "Nedůvěřivý"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      )} />
                      {customerMood}
                    </span>
                  </div>

                  {/* Patience Gauge Progress Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">Trpělivost:</span>
                    <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          patience > 60 ? "bg-emerald-500" : patience > 30 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${patience}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300">{patience}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isAiSpeaking) stopSpeaking();
                    setIsVoiceModeEnabled(!isVoiceModeEnabled);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                    isVoiceModeEnabled
                      ? "bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-700"
                      : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                  )}
                  title={isVoiceModeEnabled ? "Vypnout hlasový výstup AI" : "Zapnout hlasový výstup AI"}
                >
                  {isVoiceModeEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{isVoiceModeEnabled ? "Hlas Zákazníka (TTS ON)" : "TTS OFF"}</span>
                </button>

                <button
                  onClick={() => {
                    stopSpeaking();
                    handleFinishTraining();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ukončit & Vyhodnotit
                </button>
              </div>
            </div>

            {/* Training Session Status Sub-Bar */}
            <div className="px-5 py-2 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                  <span>Training session • Session-only</span>
                </span>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{formatDuration(callDurationSeconds)}</span>
                </span>
                <span className="text-zinc-700">|</span>
                <span className={cn(
                  "flex items-center gap-1.5",
                  callState === "ai-speaking" ? "text-emerald-300" : callState === "processing" ? "text-amber-300" : "text-zinc-300"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    callState === "ai-speaking" ? "bg-emerald-400 animate-pulse" : callState === "processing" ? "bg-amber-400 animate-pulse" : "bg-zinc-500"
                  )} />
                  <span>{callState === "ai-speaking" ? "AI speaking" : callState === "processing" ? "Processing" : isRecording ? "Listening" : "Ready"}</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Speech Rate Coach Badge */}
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border font-mono",
                  calculateWpm().status === "optimal"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                    : calculateWpm().status === "slow"
                    ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                    : "bg-rose-950/60 text-rose-300 border-rose-800/60"
                )}>
                  <Gauge className="w-3 h-3" />
                  <span>{calculateWpm().label}</span>
                </span>

              </div>
            </div>

            <div className={cn(
              "px-5 py-2 border-b text-[10px] font-mono",
              aiSource === "gemini-flash" || aiSource === "openai-responses"
                ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-300"
                : "bg-amber-950/30 border-amber-900/50 text-amber-300"
            )}>
              <span>{aiSource === "gemini-flash" ? "Gemini Flash" : aiSource === "openai-responses" ? "OpenAI Responses" : aiSource === "rule-engine" ? "Local training engine" : "AI source pending"}</span>
              {aiNotice && <span className="ml-2 text-amber-200">• {aiNotice}</span>}
            </div>

            {/* Teleprompter / Live Sales Script Reader Widget */}
            {selectedScenario && (
              <div className="px-5 py-3 bg-zinc-950/90 border-b border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                      Teleprompter (Čtečka Skriptu v Reálném Čase)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {[
                      { phase: 1, name: "1. Přivítání" },
                      { phase: 2, name: "2. Potřeby" },
                      { phase: 3, name: "3. Užitek" },
                      { phase: 4, name: "4. Námitka" },
                      { phase: 5, name: "5. Uzavření" },
                    ].map((p) => (
                      <button
                        key={p.phase}
                        type="button"
                        onClick={() => setActiveScriptPhase(p.phase)}
                        className={cn(
                          "px-2 py-0.5 rounded transition-colors cursor-pointer",
                          activeScriptPhase === p.phase
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold"
                            : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs font-mono text-zinc-200 leading-relaxed flex items-center justify-between gap-4 shadow-inner">
                  <div className="space-y-0.5 flex-1">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 block">
                      Doporučený prodejní skript k přečtení naživo:
                    </span>
                    <p className="italic text-emerald-200 text-xs">
                      "{getTeleprompterScript(selectedScenario.targetProduct, activeScriptPhase, selectedScenario.personalityType)}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const scriptText = getTeleprompterScript(selectedScenario.targetProduct, activeScriptPhase, selectedScenario.personalityType);
                      setInputText(scriptText);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium shrink-0 cursor-pointer transition-colors"
                    title="Načíst skript do textového pole"
                  >
                    Načíst do Pole
                  </button>
                </div>
              </div>
            )}

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
                <div className="flex items-center gap-2 text-xs text-zinc-400 italic bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl w-fit animate-pulse font-mono">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  AI Zákazník přemýšlí nad odpovědí...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Controls & Speech Recognition */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 space-y-3">
              {liveTranscript && (
                <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span>Operator transcript</span>
                  </div>
                  <p>{liveTranscript}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMic}
                  className={cn(
                    "p-2 rounded-lg border transition-all shrink-0 cursor-pointer",
                    isRecording
                      ? "bg-rose-950/80 text-rose-400 border-rose-800/80 animate-pulse"
                      : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:border-zinc-700"
                  )}
                  title={isRecording ? "Stop listening" : "Speak; the turn is sent after a pause"}
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
                    ? "Listening... your turn is sent after a pause"
                      : "Type a reply or speak; voice turns are sent automatically"
                  }
                  className="flex-1 bg-zinc-900/90 border border-zinc-800 focus:border-zinc-700 focus:outline-none rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 transition-colors"
                />

                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!inputText.trim() || isBotThinking}
                  className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 transition-all shrink-0 cursor-pointer"
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
                <ShieldAlert className="w-4 h-4 text-zinc-400" />
                Zákonný Hlídač (Compliance Monitor)
              </h3>

              {activeViolations.length === 0 ? (
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Zatím nebylo detekováno žádné legislativní porušení.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeViolations.map((v, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5 text-zinc-200 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          {v.rule.title}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">{v.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{v.rule.explanation}</p>
                      <div className="pt-1 text-[10px] text-zinc-300 italic">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold font-mono text-zinc-100">{scorecard.grade}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Známka</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold font-mono text-zinc-100">{scorecard.overallScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Celkové Skóre</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold font-mono text-zinc-100">{scorecard.complianceScore}%</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">Compliance</span>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-400" /> Silné stránky
              </h4>
              <ul className="text-xs text-zinc-300 space-y-2">
                {scorecard.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-400 font-mono">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-400" /> Příležitosti ke zlepšení
              </h4>
              <ul className="text-xs text-zinc-300 space-y-2">
                {scorecard.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-400 font-mono">•</span>
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
