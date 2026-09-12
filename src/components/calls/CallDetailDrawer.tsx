"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  PhoneCall,
  Clock,
  User,
  DollarSign,
  FileText,
  ClipboardCheck,
  Volume2,
} from "lucide-react";
import { CallRecord, formatCallOutcome } from "@/lib/calls";
import { getCallOutcomeClassName } from "@/lib/callOutcomeStyles";
import { getFailReasonLabel, isFailReason } from "@/lib/postCall";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

function reviewStatusLabel(status: CallRecord["review_status"]): string {
  if (status === "not_reviewed") return "Not reviewed";
  if (status === "reviewed") return "Reviewed";
  if (status === "corrected") return "Corrected";
  return "Not available";
}

interface CallDetailDrawerProps {
  call: CallRecord | null;
  isOpen: boolean;
  onClose: () => void;
  reviewHref?: string | null;
}

export function CallDetailDrawer({ call, isOpen, onClose, reviewHref = null }: CallDetailDrawerProps) {
  if (!isOpen || !call) return null;

  const transcriptTurnCount = call.transcript.kind === "structured"
    ? call.transcript.entries.length
    : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <Surface variant="overlay" className="w-full">
      <div className="w-full max-w-xl h-full flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100 font-mono">Call Record #{call.id}</h2>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getCallOutcomeClassName(call.outcome)}`}>
                  {formatCallOutcome(call.outcome)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Customer: <strong className="text-zinc-200">{call.lead_name}</strong></span>
                <span>•</span>
                <span>Operator: {call.agent_name}</span>
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
          {reviewHref && (
            <Link href={reviewHref} className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800">
              Open Team Leader Review
            </Link>
          )}
          
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
              <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Call review</span>
              <span className="font-bold text-zinc-200 text-sm flex items-center gap-1.5 mt-0.5 font-mono">
                <ClipboardCheck className="w-4 h-4 text-zinc-400" />
                {reviewStatusLabel(call.review_status)}
              </span>
            </div>
          </div>

          {(call.fail_reason || call.operator_note) && (
            <StatusAlert tone="danger">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-rose-300/80">Fail details</span>
              {call.fail_reason && (
                <p className="text-sm font-semibold text-rose-100">
                  {isFailReason(call.fail_reason) ? getFailReasonLabel(call.fail_reason) : call.fail_reason}
                </p>
              )}
              {call.operator_note && <p className="whitespace-pre-wrap text-xs leading-relaxed text-rose-200/80">{call.operator_note}</p>}
            </StatusAlert>
          )}

          {/* Audio recording state */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                Call recording
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">Unavailable</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">No verified audio recording is attached to this call.</p>
          </div>

          {/* Full Speech Transcript Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
              <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Speech transcript {transcriptTurnCount === null ? "" : `(${transcriptTurnCount} turns)`}
              </h3>
              <span className="text-[11px] text-zinc-400 font-mono">
                {call.transcript.kind === "unavailable" ? "Unavailable" : "Captured"}
              </span>
            </div>

            {call.transcript.kind === "unavailable" ? (
              <StatusAlert tone="neutral">
                No verified speech transcript was captured for this call. The CRM did not invent a transcript.
              </StatusAlert>
            ) : call.transcript.kind === "plain_text" ? (
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Legacy unstructured transcript
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                  {call.transcript.text}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {call.transcript.entries.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border space-y-1 text-xs ${
                      item.speaker === "operator"
                        ? "bg-zinc-950/60 border-zinc-800 text-zinc-200 ml-4"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 mr-4"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-zinc-400 font-mono">
                      {item.speaker === "operator" ? `OPERATOR (${call.agent_name})` : `CUSTOMER (${call.lead_name})`}
                      </span>
                      <span className="text-zinc-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
      </Surface>
    </div>
  );
}
