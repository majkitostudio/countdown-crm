"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldAlert,
  Volume2,
  ArrowRight,
  Mic,
  Globe,
  Send,
  Zap,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Check
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { useSpeechRecognition, SpeechLanguage } from "@/hooks/useSpeechRecognition";
import { analyzeCallTranscriptAction } from "@/app/actions/copilot";
import type { CopilotAnalysisResult } from "@/lib/ai/types";
import { matchObjectionToProduct } from "@/lib/objections";
import { getProducts, Product } from "@/lib/products";
import { checkCompliance, ComplianceViolation } from "@/lib/compliance";
import { SentimentHeatmap, SentimentSegment } from "./SentimentHeatmap";
import { ComplianceChecker } from "./ComplianceChecker";

import { AiFollowupModal } from "./AiFollowupModal";
import { Mail } from "lucide-react";

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

const EMPTY_ANALYSIS_RESULT: CopilotAnalysisResult = {
  sentiment: "Neutral",
  detectedObjection: null,
  confidenceScore: 0,
  rebuttalArguments: [],
  nextBestAction: "Add a customer response before requesting analysis.",
  aiSource: "unavailable",
};

export function AiCopilotPanel({ isCallActive, activeLead, onApplyPitch }: AiCopilotPanelProps) {
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
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
  const [isResolved, setIsResolved] = useState(false);
  const [complianceViolations, setComplianceViolations] = useState<ComplianceViolation[]>([]);

  const heatmapSegments: SentimentSegment[] = [];

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getProducts()
      .then((products) => {
        if (!cancelled) setActiveProduct(products[0] || null);
      })
      .catch(() => {
        if (!cancelled) setActiveProduct(null);
      });
    return () => { cancelled = true; };
  }, []);

  const [analysisResult, setAnalysisResult] = useState<CopilotAnalysisResult>(EMPTY_ANALYSIS_RESULT);

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const transcriptEndRef = React.useRef<HTMLDivElement>(null);

  // Reset transcript and analysis on activeLead change
  useEffect(() => {
    if (activeLead) {
      const timer = setTimeout(() => {
        setTranscript([]);
        setAnalysisResult(EMPTY_ANALYSIS_RESULT);
        setIsResolved(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeLead]);

  // Auto scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, interimTranscript]);

  // Handle listening state
  useEffect(() => {
    if (isCallActive) {
      startListening();
    } else {
      stopListening();
    }
  }, [isCallActive, startListening, stopListening]);

  // Check compliance on agent speech
  useEffect(() => {
    const agentText = transcript.filter((t) => t.speaker === "agent").map((t) => t.text).join(" ");
    if (agentText) {
      const violations = checkCompliance(agentText);
      const timer = setTimeout(() => {
        setComplianceViolations(violations);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  // Handle mic input
  useEffect(() => {
    if (micTranscript.trim()) {
      const lastLine = micTranscript.trim();
      const timer = setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          {
            id: `t-mic-${Date.now()}`,
            speaker: "agent",
            text: lastLine,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [micTranscript]);

  const runGeminiAnalysis = async (fullTranscriptText: string) => {
    setIsAnalyzing(true);
    setIsResolved(false);

    const rawResult = await analyzeCallTranscriptAction(
      fullTranscriptText,
      activeLead?.full_name || "Unknown customer",
      activeProduct?.title || "Unknown product"
    );

    // Match detected objection against product battle-card DB
    const matched = matchObjectionToProduct(rawResult.detectedObjection, activeProduct || undefined);

    setAnalysisResult({
      ...rawResult,
      detectedObjection: matched.matchedTitle,
      confidenceScore: matched.matchScore,
      rebuttalArguments: matched.rebuttalArgs.length > 0 ? matched.rebuttalArgs : rawResult.rebuttalArguments,
    });

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

    const fullText = updatedTranscript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
    runGeminiAnalysis(fullText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedText.trim()) return;

    handleSimulateCustomerPhrase(simulatedText.trim());
    setSimulatedText("");
  };

  const handleMarkResolved = () => {
    setIsResolved(true);
    setAnalysisResult((prev) => ({
      ...prev,
      sentiment: "Positive",
      nextBestAction: "Objection resolved! Proceed to checkout in right panel.",
    }));
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-full">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-100">Objection Handling Engine</h2>
              <span className="text-[10px] bg-zinc-950 text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-zinc-800 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                {analysisResult.aiSource === "gemini-flash"
                  ? "AI preview"
                  : analysisResult.aiSource === "rule-engine"
                    ? "Rule engine"
                    : "Unavailable"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Pilot simulation • speech analysis & battle-card preview</p>
          </div>
        </div>

        {/* Language selector, AI Followup & Mic Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFollowupModalOpen(true)}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Generovat AI e-mail nebo WhatsApp zprávu po hovoru"
          >
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">AI Follow-up</span>
          </button>

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

          <div className="px-2.5 py-1 rounded-md text-xs font-mono border bg-zinc-900 border-zinc-800 text-zinc-300 flex items-center gap-1.5">
            <span
              className={
                isResolved || analysisResult.sentiment === "Positive"
                  ? "w-1.5 h-1.5 rounded-full bg-emerald-500"
                  : "w-1.5 h-1.5 rounded-full bg-amber-500"
              }
            />
            <span>{isResolved ? "Objection Resolved" : analysisResult.sentiment}</span>
          </div>
        </div>
      </div>

      {/* Live Voice Sentiment Heatmap Component */}
      <SentimentHeatmap
        segments={heatmapSegments}
        currentSentiment={analysisResult.sentiment}
        confidenceScore={analysisResult.confidenceScore}
      />

      {/* Live Regulatory Compliance Warning Banner */}
      <ComplianceChecker violations={complianceViolations} />

      {/* Real-time AI Rebuttal Battle-Card Box */}
      <div className="border rounded-xl p-4 space-y-3 transition-all bg-zinc-950/80 border-zinc-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold max-w-[70%]">
            {isResolved ? (
              <CheckCircle2 className="w-4 h-4 text-zinc-300 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="text-zinc-200 truncate" title={analysisResult.detectedObjection || undefined}>
              {isResolved ? "OBJECTION RESOLVED" : `OBJECTION MATCH: "${analysisResult.detectedObjection || "General Inquiry"}"`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isResolved && analysisResult.aiSource !== "unavailable" && (
              <button
                onClick={handleMarkResolved}
                className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-mono px-2.5 py-1 rounded-md border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Mark Resolved</span>
              </button>
            )}

            <button
              onClick={() => {
                const fullText = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");
                runGeminiAnalysis(fullText);
              }}
              disabled={isAnalyzing}
              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium px-2 py-1 rounded-md border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 text-zinc-400 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Analyzing..." : `${analysisResult.confidenceScore}% Match`}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {analysisResult.rebuttalArguments.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onApplyPitch && onApplyPitch(sug)}
              className="w-full text-left p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-lg text-xs text-zinc-200 flex items-center justify-between gap-2 group transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center font-mono font-medium text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-tight text-zinc-200">{sug}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Next Best Action Banner */}
        <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
          <Zap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Next Best Action: <strong className="text-zinc-200">{analysisResult.nextBestAction}</strong></span>
        </div>
      </div>

      {/* Live Speech Transcript Box */}
      <div className="flex-1 flex flex-col min-h-[190px] bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2 font-medium text-zinc-400 uppercase tracking-wider text-[10px]">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Speech Recognition ({language})</span>
            {isListening && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium text-[10px] lowercase">
                <Mic className="w-3 h-3 animate-pulse text-emerald-400" /> live
              </span>
            )}
          </div>
          {!isSupported && (
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
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
                  ? "bg-zinc-900/60 border-zinc-800 text-zinc-200 ml-4"
                  : "bg-zinc-950 border-zinc-800 text-zinc-300 mr-4"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400">
                <span className={msg.speaker === "agent" ? "text-zinc-300" : "text-zinc-400"}>
                  {msg.speaker === "agent" ? "OPERATOR (You)" : `CUSTOMER (${activeLead?.full_name || "Lead"})`}
                </span>
                <span className="text-zinc-500 font-mono">{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed text-xs">{msg.text}</p>
            </div>
          ))}

          {interimTranscript && (
            <div className="p-2.5 rounded-xl border bg-zinc-900/40 border-zinc-800 text-zinc-400 ml-4 italic text-xs animate-pulse">
              <span className="text-[10px] font-medium block text-zinc-500 uppercase">Transcribing...</span>
              {interimTranscript}
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Test Phrase Triggers for Simulation */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            <span>Quick Objection Test Triggers:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => handleSimulateCustomerPhrase("Cena je příliš vysoká, nemohu si to dovolit.")}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              &ldquo;Cena je vysoká&rdquo;
            </button>
            <button
              onClick={() => handleSimulateCustomerPhrase("Používám už podobný doplňek od jiné firmy.")}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              &ldquo;Používám jinou značku&rdquo;
            </button>
            <button
              onClick={() => handleSimulateCustomerPhrase("Skvělé, chci si produkt okamžitě objednat!")}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
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

      {/* AI Email & WhatsApp Follow-up Generator Modal */}
      <AiFollowupModal
        lead={activeLead}
        appliedPitch={analysisResult.detectedObjection || undefined}
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
      />

    </div>
  );
}
