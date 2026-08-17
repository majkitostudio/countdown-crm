"use client";

import React, { useCallback, useState, useEffect, useSyncExternalStore } from "react";
import {
  Mail,
  MessageSquare,
  Sparkles,
  Copy,
  CheckCircle2,
  Send,
  X,
  RefreshCw
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { Product } from "@/lib/products";
import { generateFollowupAction, GenerateFollowupResult } from "@/app/actions/followup";
import { addTimelineEntry } from "@/lib/timeline";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import {
  getDemoModeServerSnapshot,
  getDemoModeSnapshot,
  subscribeDemoMode,
} from "@/lib/demoMode";

interface AiFollowupModalProps {
  lead: Lead | null;
  product?: Product | null;
  appliedPitch?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AiFollowupModal({
  lead,
  product,
  appliedPitch,
  isOpen,
  onClose,
}: AiFollowupModalProps) {
  const { identity } = useOperatorIdentity();
  const demoModeActive = useSyncExternalStore(
    subscribeDemoMode,
    getDemoModeSnapshot,
    getDemoModeServerSnapshot,
  );
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [goal, setGoal] = useState<"order_paylink" | "discount_offer" | "callback_reminder" | "graceful_thanks">("order_paylink");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateFollowupResult | null>(null);
  const [editableContent, setEditableContent] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!lead) return;
    setIsGenerating(true);
    setIsDispatched(false);
    setDispatchError(null);

    try {
      const res = await generateFollowupAction({
        leadName: lead.full_name,
        leadEmail: lead.email || undefined,
        leadPhone: lead.phone || undefined,
        productName: product?.title,
        callOutcome: lead.status,
        channel,
        goal,
        appliedPitch,
      });

      setResult(res);
      setEditableContent(res.content);
    } catch (err) {
      console.error("Failed to generate follow-up:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [appliedPitch, channel, goal, lead, product]);

  useEffect(() => {
    if (isOpen && lead) {
      const timer = setTimeout(() => {
        void handleGenerate();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleGenerate, lead]);

  if (!isOpen || !lead) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleDispatch = () => {
    if (!demoModeActive) {
      setDispatchError("Follow-up dispatch is unavailable in Production DB. Copy the reviewed message or configure an approved messaging integration.");
      return;
    }

    // Record entry on Omnichannel Timeline (COMMIT-22)
    const added = addTimelineEntry(lead.id, {
      type: channel === "email" ? "note" : "sms_paylink",
      title: channel === "email" ? `AI Email Sent: ${result?.subject || "Follow-up"}` : `WhatsApp Dispatched to ${lead.phone}`,
      description: editableContent,
      operator_name: result?.operatorName || identity?.name || "Unknown operator",
      metadata: {
        paylink_url: result?.paylinkUrl,
      },
    });

    if (!added) {
      setDispatchError("Follow-up dispatch is unavailable in Production DB until timeline persistence is implemented.");
      return;
    }

    setDispatchError(null);
    setIsDispatched(true);

    setTimeout(() => {
      setIsDispatched(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">AI Email & WhatsApp Follow-up Preview</h2>
              <p className="text-[11px] text-zinc-400 font-mono">Generate, review and copy a personalized message for {lead.full_name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel & Goal Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Channel Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  channel === "email"
                    ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold"
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-Mail</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  channel === "whatsapp"
                    ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold"
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Goal Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Message Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="order_paylink">Order Confirmation + 1-Click PayLink</option>
              <option value="discount_offer">Special 15% VIP Discount Offer</option>
              <option value="callback_reminder">Scheduled Callback Reminder</option>
              <option value="graceful_thanks">Graceful Thanks / Stay in Touch</option>
            </select>
          </div>
        </div>

        {/* Email Subject Row (if email) */}
        {channel === "email" && result?.subject && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Email Subject Line
            </label>
            <input
              type="text"
              readOnly
              value={result.subject}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-medium font-mono focus:outline-none"
            />
          </div>
        )}

        {/* Message Content Preview / Editor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Generated Message Content:</span>
            {isGenerating && (
              <span className="text-zinc-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Gemini AI Generating...
              </span>
            )}
          </div>

          <textarea
            rows={7}
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            disabled={isGenerating}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Dispatched Notification Alert */}
        {isDispatched && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Message successfully dispatched to {lead.full_name} and recorded on Omnichannel Timeline!</span>
          </div>
        )}

        {dispatchError && (
          <div role="alert" className="bg-red-950/30 border border-red-900/60 text-red-300 p-2.5 rounded-xl text-xs">
            {dispatchError}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-800">
          <p className="text-[11px] text-zinc-500">
            {demoModeActive
              ? "Demo Sandbox: dispatch is a local simulation only."
              : "Production DB: dispatch is unavailable; review and copy only."}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copied!" : "Copy Content"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDispatch}
              disabled={!demoModeActive || isGenerating || !editableContent}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{demoModeActive ? (channel === "email" ? "Send AI Email (Demo)" : "Dispatch WhatsApp (Demo)") : "Dispatch unavailable"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
