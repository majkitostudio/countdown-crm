"use client";

import React from "react";
import { Phone, PhoneOff, Sparkles, Building, MapPin, X } from "lucide-react";
import { Lead } from "@/lib/leads";

interface IncomingCallModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ lead, isOpen, onAccept, onDecline }: IncomingCallModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-zinc-900 border-2 border-emerald-500/50 text-zinc-100 p-5 rounded-2xl shadow-2xl w-80 space-y-4 relative overflow-hidden">
        
        {/* Glow accent effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Incoming Call...
            </span>
          </div>

          <button
            onClick={onDecline}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Avatar & Details */}
        <div className="flex items-center gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
          <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-base shrink-0">
            {lead.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-zinc-100 truncate">{lead.full_name}</h3>
            <p className="text-xs font-mono text-zinc-400">{lead.phone}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{lead.city || "Prague"}, {lead.country}</span>
            </div>
          </div>
        </div>

        {/* AI Score Info Pill */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Lead Score:
          </span>
          <span className="font-bold text-emerald-400">{lead.ai_score}/100</span>
        </div>

        {/* Call Controls: Accept / Decline */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onDecline}
            className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Decline
          </button>

          <button
            onClick={onAccept}
            className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            Accept Call
          </button>
        </div>

      </div>
    </div>
  );
}
