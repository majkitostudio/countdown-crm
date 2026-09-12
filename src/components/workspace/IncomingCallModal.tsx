"use client";

import React from "react";
import { Phone, PhoneOff, MapPin, X } from "lucide-react";
import { Lead } from "@/lib/leads";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

interface IncomingCallModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ lead, isOpen, onAccept, onDecline }: IncomingCallModalProps) {
  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 animate-in slide-in-from-bottom-5 duration-300 sm:inset-x-auto sm:bottom-6 sm:right-6">
      <Surface variant="overlay" className="w-full sm:w-80">
      <div className="relative max-h-[calc(100vh-1.5rem)] space-y-4 overflow-y-auto p-5 text-zinc-100">
        
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

          <Button
            variant="quiet"
            onClick={onDecline}
          >
            <X className="w-4 h-4" />
          </Button>
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
              <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "Location unavailable"}</span>
            </div>
          </div>
        </div>



        {/* Call Controls: Accept / Decline */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button
            variant="secondary"
            onClick={onDecline}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Decline
          </Button>

          <Button
            onClick={onAccept}
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            Accept Call
          </Button>
        </div>

      </div>
      </Surface>
    </div>
  );
}
