"use client";

import { useState, useRef, useEffect } from "react";
import {
  TRAINING_SCENARIOS,
  TrainingScenario,
  TrainingMessage,
  TrainingScorecard,
  CustomerPersonalityType,
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
  Clock,
  PhoneCall,
  PhoneOff,
  ShoppingCart,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { generateTrainingResponseAction } from "@/app/actions/training";
import { speakText, stopSpeaking, getPersonaVoiceSettings } from "@/lib/speechSynthesis";
import { Volume2, VolumeX, Radio } from "lucide-react";

export default function TrainingPage() {
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [patience, setPatience] = useState<number>(75);
  const [customerMood, setCustomerMood] = useState<string>("Skeptický");
  const [isHungUp, setIsHungUp] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<TrainingScorecard | null>(null);
  const [activeViolations, setActiveViolations] = useState<ComplianceViolation[]>([]);
  const [earnedXpToast, setEarnedXpToast] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [orderCreatedToast, setOrderCreatedToast] = useState<boolean>(false);

  // Instant Call Agent Configurator states
  const [isDialing, setIsDialing] = useState<boolean>(false);
  const [customPersonality, setCustomPersonality] = useState<CustomerPersonalityType>("Skeptický");
  const [customProduct, setCustomProduct] = useState<string>("Bio-Boost Anti-Aging Collagen Stack");
  const [customDifficulty, setCustomDifficulty] = useState<"Snadná" | "Střední" | "Těžká">("Střední");
  const [activeScriptPhase, setActiveScriptPhase] = useState<number>(1);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleCreateInCallOrder = () => {
    if (!selectedScenario || isHungUp) return;
    setOrderCreatedToast(true);
    setPatience(100);
    setCustomerMood("Nadšený");

    const orderMsg: TrainingMessage = {
      id: `order_${Date.now()}`,
      sender: "ai_customer",
      text: `🎉 Objednávka na ${selectedScenario.targetProduct} byla úspěšně vyhotovena přímo během hovoru!`,
      timestamp: new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      sentiment: "positive",
      customerMood: "Nadšený",
      patienceGauge: 100,
    };

    setMessages((prev) => [...prev, orderMsg]);
    playAiAudio("Perfektní, děkuji za vyřízení objednávky, velmi rád vás doporučím dál!", selectedScenario);

    setTimeout(() => {
      handleFinishTraining();
    }, 2800);
  };

  const playAiAudio = (text: string, scenario: TrainingScenario) => {
    if (!isVoiceModeEnabled) return;
    const voiceSettings = getPersonaVoiceSettings(scenario.personalityType);
    speakText(text, {
      ...voiceSettings,
      onStart: () => setIsAiSpeaking(true),
      onEnd: () => setIsAiSpeaking(false),
      onError: () => setIsAiSpeaking(false),
    });
  };

  const handleStartScenario = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setScorecard(null);
    setActiveViolations([]);
    setEarnedXpToast(null);
    setPatience(75);
    setCustomerMood(scenario.personalityType);
    setIsHungUp(false);
    setCallDurationSeconds(0);
    setIsMuted(false);
    setOrderCreatedToast(false);

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

  const handleLaunchCallAgent = (
    personality: CustomerPersonalityType = customPersonality,
    product: string = customProduct,
    difficulty: "Snadná" | "Střední" | "Těžká" = customDifficulty
  ) => {
    setIsDialing(true);
    const personaNames: Record<CustomerPersonalityType, string> = {
      Skeptický: "Karel Svoboda",
      "Cenově citlivý": "Petr Dvořák",
      Netrpělivý: "Martin Kučera",
      "Náročný / Cholerický": "Zdeněk Horák",
      Nedůvěřivý: "Lenka Novotná",
    };

    const personaDescriptions: Record<CustomerPersonalityType, string> = {
      Skeptický: "Nevěří tvrzením o účinnosti doplňků a požaduje vědecké důkazy.",
      "Cenově citlivý": "Zpochybňuje cenu a porovnává ji s levnějšími alternativami.",
      Netrpělivý: "Spěchá, vyžaduje stručné informace a nechce poslouchat dlouhé řeči.",
      "Náročný / Cholerický": "Reaguje podrážděně na obecné fráze a vyžaduje okamžitá řešení.",
      Nedůvěřivý: "Podezírá operátora z podvodu a vyžaduje oficiální certifikáty.",
    };

    const initialGreetings: Record<CustomerPersonalityType, string> = {
      Skeptický: `Dobrý den, u telefonu ${personaNames[personality]}. Voláte ohledně ${product}? Upřímně, těmto produktům moc nevěřím, tak mě přesvědčte.`,
      "Cenově citlivý": `Dobrý den, u telefonu ${personaNames[personality]}. Slyšel jsem o ${product}, ale prý je to strašně drahé. Co mi k tomu řeknete?`,
      Netrpělivý: `Dobrý den, ${personaNames[personality]}. Nemám moc času, o co přesně u toho ${product} jde? Buďte struční!`,
      "Náročný / Cholerický": `Dobrý den, ${personaNames[personality]}. Doufám, že mi nebudete nabízet nějaké předražené hlouposti kolem ${product}!`,
      Nedůvěřivý: `Ano, poslouchám. Kdo přesně volá a odkud máte moje číslo? Doufám, že ${product} není nějaký podvod z internetu.`,
    };

    const customScenario: TrainingScenario = {
      id: `custom_${Date.now()}`,
      title: `Živá Simulace: ${personality} Zákazník`,
      difficulty,
      personalityType: personality,
      customerName: personaNames[personality],
      customerPersona: personaDescriptions[personality],
      targetProduct: product,
      goals: [
        `Správně odprezentovat hlavní užitek ${product}`,
        `Úspěšně překonat námitku typu ${personality}`,
        "Uzavřít prodej s garancí spokojenosti",
      ],
      initialMessage: initialGreetings[personality],
      hiddenMotivations: [
        `Hledá ověřené řešení pro ${product}`,
        "Při 30denní garanci vrácení je ochoten nakoupit ihned",
      ],
    };

    setTimeout(() => {
      setIsDialing(false);
      handleStartScenario(customScenario);
      setActiveScriptPhase(1);
    }, 1600);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedScenario || isBotThinking || isHungUp) return;

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
      const aiResponse = await generateTrainingResponseAction(selectedScenario, newHistory, userText);

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
          setInputText(transcript);
          // Auto-send after voice pause in Hands-Free mode
          setTimeout(() => {
            const sendBtn = document.getElementById("send-training-msg-btn");
            if (sendBtn) sendBtn.click();
          }, 300);
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

      {/* Dialing Tone Overlay */}
      {isDialing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="text-center space-y-4 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
              <PhoneCall className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 font-mono">Vytočení čísla...</h3>
              <p className="text-xs text-zinc-400">Spojování s klientem ({customPersonality})</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Vytváření šifrovaného hlasového kanálu...</span>
            </div>
          </div>
        </div>
      )}

      {!selectedScenario || (!isSimulating && !scorecard) ? (
        /* Scenario Selection & Call Agent Launcher */
        <div className="space-y-8">
          {/* Anytime Accessible Call Agent Configurator */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md space-y-5 shadow-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  Živý Call Agent — Konfigurátor Hlasového Hovoru
                </h2>
                <p className="text-xs text-zinc-400">
                  Kdykoliv si zvolte typ zákazníka a produkt, klikněte na "CALL AGENT" a jedete ihned naživo přes mikrofon.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                Hands-Free Live Voice
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Customer Personality Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Typ Zákazníka (Osobnost)
                </label>
                <select
                  value={customPersonality}
                  onChange={(e) => setCustomPersonality(e.target.value as CustomerPersonalityType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                >
                  <option value="Skeptický">Skeptický (Vyžaduje vědecké důkazy)</option>
                  <option value="Cenově citlivý">Cenově citlivý (Porovnává levnější alternativy)</option>
                  <option value="Netrpělivý">Netrpělivý (Spěchá, vyžaduje stručnost)</option>
                  <option value="Náročný / Cholerický">Náročný / Cholerický (Reaguje podrážděně)</option>
                  <option value="Nedůvěřivý">Nedůvěřivý (Podezírá z podvodu / vyžaduje záruky)</option>
                </select>
              </div>

              {/* Target Product Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Produkt Prodejního Hovoru
                </label>
                <select
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                >
                  <option value="Bio-Boost Anti-Aging Collagen Stack">Bio-Boost Anti-Aging Collagen Stack ($129)</option>
                  <option value="Liposomal Vitamin C Supercharge">Liposomal Vitamin C Supercharge ($49)</option>
                  <option value="Collagen Glow Facial Serum">Collagen Glow Facial Serum ($89)</option>
                  <option value="RoboClean Pro LiDAR V8">RoboClean Pro LiDAR V8 Vacuum ($499)</option>
                  <option value="Hyaluronic Acid Moisture Booster">Hyaluronic Acid Moisture Booster ($65)</option>
                </select>
              </div>

              {/* Difficulty Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Obtížnost Rozhovoru
                </label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium"
                >
                  <option value="Snadná">Snadná (Vstřícnější reakce)</option>
                  <option value="Střední">Střední (Standardní námitky)</option>
                  <option value="Těžká">Těžká (Příkré námitky & nízká trpělivost)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Připraveno k okamžitému spojení s Gemini AI Zákazníkem</span>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchCallAgent()}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 fill-current animate-pulse" />
                <span>📞 CALL AGENT — SPOJIT SE NAŽIVO</span>
              </button>
            </div>
          </div>

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

            {/* Live Phone Line Status Sub-Bar */}
            <div className="px-5 py-2 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                  <span>Linka 01 • Aktivní Hovor</span>
                </span>
                <span className="text-zinc-700">|</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{formatDuration(callDurationSeconds)}</span>
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

                {/* 1-Click In-Call Order Creation */}
                <button
                  type="button"
                  onClick={handleCreateInCallOrder}
                  className="px-2.5 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-3 h-3 text-emerald-400" />
                  <span>1-Click Objednávka</span>
                </button>
              </div>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMic}
                  className={cn(
                    "p-2 rounded-lg border transition-all shrink-0 cursor-pointer",
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

            {/* Hidden Motivations Panel */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-3">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                  Skryté Nákupní Motivace
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {patience >= 60 ? "🔓 ODHALENO" : "🔒 ZAMČENO (<60% Trpělivost)"}
                </span>
              </h3>

              {patience >= 60 ? (
                <div className="space-y-2">
                  {selectedScenario.hiddenMotivations?.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-start gap-2 animate-in fade-in duration-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-500 italic">
                  Získejte si důvěru a zvýšte trpělivost zákazníka nad 60 %, aby odhalil své skryté nákupní motivace.
                </div>
              )}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
              <span className="text-2xl font-bold font-mono text-zinc-100">+{scorecard.xpEarned}</span>
              <span className="text-[10px] block text-zinc-400 uppercase tracking-wider font-medium">XP Získané</span>
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
