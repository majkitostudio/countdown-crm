"use client";

import React from "react";
import { Phone, PhoneOff, MapPin, X } from "lucide-react";
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
      <div className="bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-xl text-zinc-100 p-5 rounded-xl shadow-2xl w-80 space-y-4 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
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
        <div className="flex items-center gap-3 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-zinc-200 text-sm shrink-0">
            {lead.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-zinc-100 truncate">{lead.full_name}</h3>
            <p className="text-xs font-mono text-zinc-400">{lead.phone}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{lead.city || "Prague"}, {lead.country}</span>
            </div>
          </div>
        </div>



        {/* Call Controls: Accept / Decline */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={onDecline}
            className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Decline
          </button>

          <button
            onClick={onAccept}
            className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            Accept Call
          </button>
        </div>

      </div>
    </div>
  );
}
