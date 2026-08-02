"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Sparkles,
  DollarSign,
  Clock,
  History,
  CheckCircle,
  FileText,
  ChevronDown,
  ShoppingBag
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { Order, getOrdersByLeadId } from "@/lib/orders";
import { DynamicAttributesCard } from "@/components/workspace/DynamicAttributesCard";
import { enrichLeadWithGemini, EnrichedCompanyData } from "@/lib/enrichment";
import { RefreshCw } from "lucide-react";

interface CustomerPanelProps {
  leads: Lead[];
  activeLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
}

export function CustomerPanel({ leads, activeLead, onSelectLead }: CustomerPanelProps) {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [enrichmentData, setEnrichmentData] = useState<EnrichedCompanyData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    async function loadCustomerOrders() {
      if (activeLead) {
        const orders = await getOrdersByLeadId(activeLead.id);
        setCustomerOrders(orders);
        setEnrichmentData(null); // Reset on lead change
      }
    }
    loadCustomerOrders();
  }, [activeLead]);

  const handleEnrich = async () => {
    if (!activeLead) return;
    setIsEnriching(true);
    try {
      const data = await enrichLeadWithGemini(activeLead);
      setEnrichmentData(data);
    } catch (err) {
      console.error("Enrichment error:", err);
    } finally {
      setIsEnriching(false);
    }
  };

  if (!activeLead) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-6 text-center text-zinc-500 text-xs">
        No active customer selected. Select a lead from database.
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-800/60 bg-emerald-950/80";
    if (score >= 70) return "text-amber-400 border-amber-800/60 bg-amber-950/80";
    return "text-zinc-400 border-zinc-700 bg-zinc-800/50";
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-5 flex flex-col h-full overflow-y-auto">
      
      {/* Lead Selector Header */}
      <div className="space-y-1.5 pb-4 border-b border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
          Active Customer Selection
        </label>
        <div className="relative">
          <select
            value={activeLead.id}
            onChange={(e) => {
              const selected = leads.find((l) => l.id === e.target.value);
              if (selected) onSelectLead(selected);
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-zinc-700 appearance-none cursor-pointer pr-8"
          >
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name} ({l.city || "Prague"}) — AI Score {l.ai_score}/100
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Customer Profile Card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-lg">
            {activeLead.full_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">{activeLead.full_name}</h2>
            <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5 text-zinc-500" />
              <span>{activeLead.company || "Independent"}</span>
            </div>
          </div>
        </div>

        {/* AI Score Badge */}
        <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center ${getScoreColor(activeLead.ai_score)}`}>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            AI Score
          </div>
          <span className="text-base font-extrabold">{activeLead.ai_score}/100</span>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone
          </span>
          <span className="font-mono text-zinc-200 font-medium">{activeLead.phone}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-400" /> Email
          </span>
          <span className="text-zinc-200 font-medium truncate max-w-[170px]">{activeLead.email || "N/A"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Location
          </span>
          <span className="text-zinc-200 font-medium">{activeLead.city || "Prague"}, {activeLead.country}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Pipeline Value
          </span>
          <span className="text-zinc-100 font-mono font-bold">${activeLead.value || 750}</span>
        </div>
      </div>

      {/* AI Data Enrichment Trigger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Market Intelligence
          </span>
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isEnriching ? "animate-spin" : ""}`} />
            <span>{isEnriching ? "Enriching..." : "✨ AI Enrich Data"}</span>
          </button>
        </div>

        {enrichmentData && (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Odvětví:</span>
              <span className="font-semibold text-cyan-300">{enrichmentData.industry}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Velikost / Obrat:</span>
              <span className="text-zinc-300">{enrichmentData.estimatedEmployees} ({enrichmentData.estimatedRevenue})</span>
            </div>
            <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
              <span className="text-zinc-500">Klíčová potřeba:</span> {enrichmentData.keyPainPoints}
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Notes */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          AI Customer Insights & Notes
        </h3>
        <p className="text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
          {activeLead.notes || "No previous notes available for this customer."}
        </p>
      </div>

      {/* Dynamic EAV Attributes from SchemaEngine */}
      <DynamicAttributesCard lead={activeLead} />

      {/* Historical Purchases & Activity */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            Customer Purchase History ({customerOrders.length})
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {customerOrders.length === 0 ? (
            <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs">
              No orders placed yet for this customer.
            </div>
          ) : (
            customerOrders.map((ord) => (
              <div key={ord.id} className="p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-zinc-200">{ord.product_title}</p>
                    <p className="text-[11px] text-zinc-500">
                      Order #{ord.id} • {new Date(ord.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400 shrink-0">
                  ${ord.total_amount.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
