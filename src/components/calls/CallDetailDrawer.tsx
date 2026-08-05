"use client";

import React, { useState } from "react";
import {
  X,
  PhoneCall,
  Clock,
  User,
  DollarSign,
  Play,
  Pause,
  Sparkles,
  FileText,
  CheckCircle2,
  TrendingUp,
  Volume2,
  Calendar
} from "lucide-react";
import { CallRecord } from "@/lib/calls";

interface CallDetailDrawerProps {
  call: CallRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CallDetailDrawer({ call, isOpen, onClose }: CallDetailDrawerProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!isOpen || !call) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const getOutcomeBadge = (outcome: CallRecord["outcome"]) => {
    return "bg-zinc-900 text-zinc-300 border-zinc-800 font-mono";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/80 h-full flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100 font-mono">Call Record #{call.id}</h2>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getOutcomeBadge(call.outcome)}`}>
                  {call.outcome.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Customer: <strong className="text-zinc-200">{call.lead_name}</strong></span>
                <span>•</span>
                <span>Agent: {call.agent_name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Call Duration</span>
              <span className="font-mono font-bold text-zinc-200 text-sm flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-zinc-400" />
                {formatDuration(call.duration_seconds)}
              </span>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Order Generated</span>
              <span className="font-mono font-bold text-zinc-200 text-sm flex items-center gap-1.5 mt-0.5">
                <DollarSign className="w-4 h-4 text-zinc-400" />
                ${call.order_value.toFixed(2)}
              </span>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">AI Sentiment</span>
              <span className="font-bold text-zinc-200 text-sm flex items-center gap-1.5 mt-0.5 font-mono">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                {call.sentiment}
              </span>
            </div>
          </div>

          {/* Audio Record Player Simulator */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                Call Recording Audio Track
              </span>
              <span className="font-mono text-zinc-500 text-[11px]">HD Audio • 128 kbps</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Animated Audio Wave Spectrum */}
              <div className="flex-1 h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-3 flex items-center gap-1">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isPlayingAudio ? "bg-zinc-300 animate-pulse" : "bg-zinc-700"
                    }`}
                    style={{
                      height: `${Math.max(20, Math.sin(i * 0.5) * 80)}%`,
                      animationDelay: `${i * 50}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Full Speech Transcript Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
              <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Full Speech Transcript ({call.transcript.length} turns)
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Auto-transcribed by WebSpeech API</span>
            </div>

            <div className="space-y-2.5">
              {call.transcript.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-1 text-xs ${
                    item.speaker === "agent"
                      ? "bg-zinc-950/60 border-zinc-800 text-zinc-200 ml-4"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-zinc-400 font-mono">
                      {item.speaker === "agent" ? `OPERATOR (${call.agent_name})` : `CUSTOMER (${call.lead_name})`}
                    </span>
                    <span className="text-zinc-500 font-mono">{item.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
