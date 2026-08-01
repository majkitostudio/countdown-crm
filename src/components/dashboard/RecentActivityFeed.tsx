"use client";

import { Activity, Clock, User, Phone, CheckCircle, AlertCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallActivity {
  id: string;
  time: string;
  customerName: string;
  agentName: string;
  duration: string;
  outcome: "order_placed" | "followup_scheduled" | "price_objection" | "no_answer";
  outcomeText: string;
  dealValue?: string;
  aiSentiment?: string;
}

const RECENT_CALLS: CallActivity[] = [
  {
    id: "call-1",
    time: "10:42 AM",
    customerName: "Petr Svoboda",
    agentName: "John Doe",
    duration: "04:12",
    outcome: "order_placed",
    outcomeText: "Order Placed",
    dealValue: "$420.00",
    aiSentiment: "Positive Interest",
  },
  {
    id: "call-2",
    time: "10:38 AM",
    customerName: "Elena Novak",
    agentName: "Sarah Jenkins",
    duration: "02:45",
    outcome: "price_objection",
    outcomeText: "Price Objection Alert",
    aiSentiment: "Price Sensitivity",
  },
  {
    id: "call-3",
    time: "10:25 AM",
    customerName: "Tomas Dvorak",
    agentName: "Mike Ross",
    duration: "05:30",
    outcome: "followup_scheduled",
    outcomeText: "Follow-up Scheduled",
    aiSentiment: "Decision Maker Review",
  },
  {
    id: "call-4",
    time: "10:12 AM",
    customerName: "Katerina Cerna",
    agentName: "John Doe",
    duration: "01:15",
    outcome: "no_answer",
    outcomeText: "No Answer / Voicemail",
  },
];

export function RecentActivityFeed() {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Live Call Activity & AI Sentiment Stream
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time feed of finished calls, orders, and detected customer objections
          </p>
        </div>

        <a
          href="/calls"
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
        >
          <span>View All Calls</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Activity Items List */}
      <div className="space-y-2.5">
        {RECENT_CALLS.map((call) => (
          <div
            key={call.id}
            className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700/80 transition-all"
          >
            {/* Customer & Agent Details */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">
                    {call.customerName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    [{call.time}]
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                  <span>Agent: <strong className="text-zinc-300 font-normal">{call.agentName}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {call.duration}
                  </span>
                </div>
              </div>
            </div>

            {/* Outcome & AI Sentiment (Colors ONLY for critical highlights) */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              {call.aiSentiment && (
                <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                  {call.aiSentiment}
                </span>
              )}

              <div className="flex items-center gap-2">
                {call.outcome === "order_placed" ? (
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {call.outcomeText} ({call.dealValue})
                  </span>
                ) : call.outcome === "price_objection" ? (
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {call.outcomeText}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {call.outcomeText}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
