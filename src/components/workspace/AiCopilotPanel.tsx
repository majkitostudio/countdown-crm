"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldAlert,
  Volume2,
  TrendingUp,
  ArrowRight,
  Mic,
  Globe,
  Send,
  Zap,
  RefreshCw,
  CheckCircle2,
  Cpu
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { useSpeechRecognition, SpeechLanguage } from "@/hooks/useSpeechRecognition";
import { analyzeCallTranscriptAction } from "@/app/actions/copilot";
import { CopilotAnalysisResult } from "@/lib/gemini";

interface TranscriptMessage {
  id: string;
  speaker: "agent" | "customer";
  text: string;
  timestamp: string;
}

interface AiCopilotPanelProps {
  isCallActive: boolean;
  activeLead: Lead | null;
  onApplyPitch?: (pitchText: string) => void;
}

export function AiCopilotPanel({ isCallActive, activeLead, onApplyPitch }: AiCopilotPanelProps) {
  const {
    isListening,
    transcript: micTranscript,
    interimTranscript,
    language,
    setLanguage,
    isSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition("cs-CZ");

  const [simulatedText, setSimulatedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CopilotAnalysisResult>({
    sentiment: "Price Objection",
    detectedObjection: "Price is too high compared to pharmacy vitamins",
    confidenceScore: 92,
    rebuttalArguments: [
      "Highlight 800% higher liposomal bioavailability vs standard vitamins.",
      "Offer 3-month bundle discount which lowers monthly cost by 25%.",
      "Emphasize 30-day money-back guarantee with zero risk."
    ],
    nextBestAction: "Offer 15% VIP Closing discount or 3-month bundle plan.",
    aiSource: "gemini-flash"
  });

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    {
      id: "t-1",
      speaker: "agent",
      text: "Dobrý den, tady Alex z Countdown CRM. Mluvím s " + (activeLead?.full_name || "paní Vance") + "?",
      timestamp: "10:15:02",
    },
    {
      id: "t-2",
      speaker: "customer",
      text: "Ano, dobrý den. Prohlížela jsem si váš Bio-Boost balíček, ale ta cena se mi zdá docela vysoká.",
      timestamp: "10:15:08",
    },
  ]);

  // Start / Stop speech listener with call state
  useEffect(() => {
    if (isCallActive) {
      startListening();
    } else {
      stopListening();
    }
  }, [isCallActive, startListening, stopListening]);

  // Handle mic transcript
  useEffect(() => {
    if (micTranscript.trim()) {
      const lastLine = micTranscript.trim();
      setTranscript((prev) => [
        ...prev,
        {
          id: `t-mic-${Date.now()}`,
          speaker: "agent",
          text: lastLine,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    }
  }, [micTranscript]);

  const runGeminiAnalysis = async (fullTranscriptText: string) => {
    setIsAnalyzing(true);
    const result = await analyzeCallTranscriptAction(
      fullTranscriptText,
      activeLead?.full_name || "Customer",
      "Bio-Boost Anti-Aging Stack"
    );
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleSimulateCustomerPhrase = (phrase: string) => {
    const newMsg: TranscriptMessage = {
      id: `t-sim-${Date.now()}`,
      speaker: "customer",
      text: phrase,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    const updatedTranscript = [...transcript, newMsg];
    setTranscript(updatedTranscript);

    // Trigger Gemini analysis
    const fullText = updatedTranscript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
    runGeminiAnalysis(fullText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedText.trim()) return;

    handleSimulateCustomerPhrase(simulatedText.trim());
    setSimulatedText("");
  };

  const getSentimentBadge = (s: CopilotAnalysisResult["sentiment"]) => {
    switch (s) {
      case "Positive":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Price Objection":
      case "Product Objection":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col h-full">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-zinc-100">Google Gemini 2.5 Copilot</h2>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                {analysisResult.aiSource === "gemini-flash" ? "Gemini Flash" : "AI Engine"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Live speech analysis & objection battle-card</p>
          </div>
        </div>

        {/* Language selector & Mic Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs">
            <Globe className="w-3 h-3 text-zinc-500" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
              className="bg-transparent text-zinc-200 text-[11px] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="cs-CZ" className="bg-zinc-900">CS (Čeština)</option>
              <option value="sk-SK" className="bg-zinc-900">SK (Slovenčina)</option>
              <option value="en-US" className="bg-zinc-900">EN (English)</option>
            </select>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getSentimentBadge(analysisResult.sentiment)}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{analysisResult.sentiment}</span>
          </div>
        </div>
      </div>

      {/* Real-time AI Rebuttal Battle-Card Box */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>DETECTED: &ldquo;{analysisResult.detectedObjection || "General Inquiry"}&rdquo;</span>
          </div>

          <button
            onClick={() => {
              const fullText = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
              runGeminiAnalysis(fullText);
            }}
            disabled={isAnalyzing}
            className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>{isAnalyzing ? "Analyzing..." : `${analysisResult.confidenceScore}% Confidence`}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          {analysisResult.rebuttalArguments.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPitch && onApplyPitch(sug)}
              className="w-full text-left p-2.5 bg-zinc-950/80 hover:bg-zinc-950 border border-amber-500/30 hover:border-amber-400 rounded-lg text-xs text-zinc-200 flex items-center justify-between gap-2 group transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-tight">{sug}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Next Best Action Banner */}
        <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-1.5 font-medium">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Next Best Action: <strong>{analysisResult.nextBestAction}</strong></span>
        </div>
      </div>

      {/* Live Speech Transcript Box */}
      <div className="flex-1 flex flex-col min-h-[200px] bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 font-semibold text-zinc-400 uppercase tracking-wider text-[11px]">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Speech Recognition ({language})</span>
            {isListening && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px] lowercase">
                <Mic className="w-3 h-3 animate-pulse text-emerald-400" /> live
              </span>
            )}
          </div>
          {!isSupported && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              WebSpeech simulator active
            </span>
          )}
        </div>

        {/* Scrollable Chat Transcript */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-[220px]">
          {transcript.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl border space-y-1 ${
                msg.speaker === "agent"
                  ? "bg-zinc-900 border-zinc-800 text-zinc-200 ml-4"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200 mr-4"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                <span className={msg.speaker === "agent" ? "text-zinc-400" : "text-emerald-400"}>
                  {msg.speaker === "agent" ? "OPERATOR (You)" : `CUSTOMER (${activeLead?.full_name || "Lead"})`}
                </span>
                <span className="text-zinc-500">{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed text-xs">{msg.text}</p>
            </div>
          ))}

          {interimTranscript && (
            <div className="p-2.5 rounded-xl border bg-zinc-900/60 border-zinc-700 text-zinc-400 ml-4 italic text-xs animate-pulse">
              <span className="text-[10px] font-bold block text-zinc-500 uppercase">Transcribing...</span>
              {interimTranscript}
            </div>
          )}
        </div>

        {/* Quick Test Phrase Triggers for Simulation */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
            <span>Quick Test Triggers for Gemini Copilot:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => handleSimulateCustomerPhrase("Cena je příliš vysoká, nemohu si to dovolit.")}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
            >
              &ldquo;Cena je vysoká&rdquo;
            </button>
            <button
              onClick={() => handleSimulateCustomerPhrase("Skvělé, chci si produkt okamžitě objednat!")}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
            >
              &ldquo;Chci objednat!&rdquo;
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Type customer response or speech phrase..."
              value={simulatedText}
              onChange={(e) => setSimulatedText(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-zinc-700 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
