"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldAlert,
  MessageSquare,
  Flame,
  Check,
  TrendingUp,
  Volume2,
  Zap,
  ArrowRight,
  ThumbsUp,
  AlertTriangle
} from "lucide-react";
import { Lead } from "@/lib/leads";

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
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    {
      id: "t-1",
      speaker: "agent",
      text: "Hello! This is Alex from Countdown Health. Am I speaking with " + (activeLead?.full_name || "Eleanor") + "?",
      timestamp: "10:15:02",
    },
    {
      id: "t-2",
      speaker: "customer",
      text: "Yes, hello Alex. I was looking at your Bio-Boost Anti-Aging stack online, but I'm hesitant about the price.",
      timestamp: "10:15:08",
    },
    {
      id: "t-3",
      speaker: "agent",
      text: "I completely understand! Many of our clients ask about the value before experiencing the results.",
      timestamp: "10:15:16",
    },
  ]);

  const [sentiment, setSentiment] = useState<"Positive" | "Price Objection" | "Neutral">("Price Objection");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([
    "Highlight 800% higher liposomal absorption vs pharmacy vitamins.",
    "Offer 3-month bundle discount which lowers monthly cost by 25%.",
    "Emphasize 30-day money-back guarantee with zero risk."
  ]);

  // Simulate new transcript incoming when call is active
  useEffect(() => {
    if (activeLead) {
      setTranscript([
        {
          id: "t-1",
          speaker: "agent",
          text: `Hello ${activeLead.full_name}, this is Countdown CRM AI Copilot calling regarding your inquiry.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          id: "t-2",
          speaker: "customer",
          text: "Hi! I wanted to check if the product includes liposomal NMN and if you offer a multi-month discount?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }
      ]);
    }
  }, [activeLead]);

  const getSentimentBadge = (s: typeof sentiment) => {
    switch (s) {
      case "Positive":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Price Objection":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col h-full">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">AI Copilot Engine</h2>
            <p className="text-[11px] text-zinc-400">Real-time speech analysis & objection battle-card</p>
          </div>
        </div>

        {/* Live Sentiment Pill */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getSentimentBadge(sentiment)}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{sentiment}</span>
        </div>
      </div>

      {/* Real-time AI Rebuttal Battle-Card Box */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>OBJECTION DETECTED: &ldquo;PRICE TOO HIGH&rdquo;</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md">
            92% Confidence
          </span>
        </div>

        <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
          Suggested Sales Talking Points (Click to copy script to call notes):
        </p>

        <div className="space-y-2">
          {aiSuggestions.map((sug, idx) => (
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
      </div>

      {/* Live Speech Transcript Box */}
      <div className="flex-1 flex flex-col min-h-[220px] bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
          <span className="font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Live Speech Transcript
          </span>
          <span className="text-[11px] text-zinc-500">Auto-transcribing via Web Speech</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
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
                  {msg.speaker === "agent" ? "AGENT (You)" : `CUSTOMER (${activeLead?.full_name || "Lead"})`}
                </span>
                <span className="text-zinc-500">{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed text-xs">{msg.text}</p>
            </div>
          ))}
        </div>

        {/* Status notice */}
        <div className="text-[11px] text-zinc-500 text-center pt-1 border-t border-zinc-800/60">
          {isCallActive ? "Microphone active • Analyzing audio..." : "Call inactive • Transcript paused"}
        </div>
      </div>

    </div>
  );
}
