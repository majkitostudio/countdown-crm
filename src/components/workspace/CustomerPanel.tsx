"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  Sparkles,
  History,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { Order } from "@/lib/orders";
import { DynamicAttributesCard } from "@/components/workspace/DynamicAttributesCard";
import { enrichLeadAction } from "@/app/actions/enrichment";
import type { EnrichedCompanyData } from "@/lib/ai/types";
import { CustomerTimelineCard } from "@/components/workspace/CustomerTimelineCard";
import { RefreshCw } from "lucide-react";

interface CustomerPanelProps {
  leads: Lead[];
  activeLead: Lead | null;
  orders: Order[];
  activityRefreshToken: number;
  onSelectLead: (lead: Lead) => void;
  onCreateOrder: () => void;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

export function CustomerPanel({ leads, activeLead, orders, activityRefreshToken, onSelectLead, onCreateOrder }: CustomerPanelProps) {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [enrichmentData, setEnrichmentData] = useState<EnrichedCompanyData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    async function loadCustomerOrders() {
      if (activeLead) {
        const phone = normalizePhone(activeLead.phone);
        const matchingLeadIds = new Set(
          leads.filter((lead) => normalizePhone(lead.phone) === phone).map((lead) => lead.id)
        );
        setCustomerOrders(orders.filter((order) => matchingLeadIds.has(order.lead_id)));
        setEnrichmentData(null); // Reset on lead change
      }
    }
    loadCustomerOrders();
  }, [activeLead, leads, orders, activityRefreshToken]);

  const handleEnrich = async () => {
    if (!activeLead) return;
    setIsEnriching(true);
    try {
      const data = await enrichLeadAction(activeLead);
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
                {l.full_name} ({l.city || "Location unavailable"})
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
        <button
          type="button"
          onClick={onCreateOrder}
          className="shrink-0 px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Create Order</span>
        </button>
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
          <span className="text-zinc-200 font-medium">{[activeLead.city, activeLead.country].filter(Boolean).join(", ") || "Location unavailable"}</span>
        </div>

      </div>

      {/* AI Data Enrichment Trigger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            AI Market Intelligence
          </span>
          <button
            onClick={handleEnrich}
            disabled={isEnriching}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isEnriching ? "animate-spin" : ""}`} />
            <span>{isEnriching ? "Enriching..." : "AI Enrich Data"}</span>
          </button>
        </div>

        {enrichmentData && (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Source:</span>
              <span className="font-semibold text-zinc-200">
                {enrichmentData.enrichmentSource === "gemini-flash" ? "Gemini result" : "Unavailable"}
              </span>
            </div>
            {enrichmentData.enrichmentSource === "unavailable" ? (
              <p className="text-[11px] text-amber-300/80 pt-1 border-t border-zinc-800/60">
                Market intelligence is unavailable. No inferred company data is shown.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Odvětví:</span>
                  <span className="font-semibold text-zinc-200">{enrichmentData.industry}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Velikost / Obrat:</span>
                  <span className="text-zinc-300">{enrichmentData.estimatedEmployees} ({enrichmentData.estimatedRevenue})</span>
                </div>
                <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span className="text-zinc-500">Klíčová potřeba:</span> {enrichmentData.keyPainPoints}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Summary Notes */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          AI Customer Insights & Notes
        </h3>
        <p className="text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
          {activeLead.notes || "No previous notes available for this customer."}
        </p>
      </div>

      {/* Dynamic EAV Attributes from SchemaEngine */}
      <DynamicAttributesCard lead={activeLead} />

      {/* Omnichannel Activity Timeline */}
      <CustomerTimelineCard leadId={activeLead.id} refreshToken={activityRefreshToken} />

      {/* Historical Purchases & Activity */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            Customer History ({customerOrders.length})
          </h3>
        </div>
        <p className="text-[10px] text-zinc-500">Based on this phone number across workspace lead records. Contacts are not merged.</p>

        <div className="space-y-2 text-xs">
          {customerOrders.length === 0 ? (
            <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs">
              No previous orders found for this phone number.
            </div>
          ) : (
            customerOrders.map((ord) => (
              <OrderHistoryItem key={ord.id} order={ord} />
            ))
          )}
        </div>
      </div>

    </div>
  );
}

function OrderHistoryItem({ order }: { order: Order }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-2.5 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-xs">
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="w-full flex items-start justify-between gap-2 text-left">
        <div className="flex items-start gap-2.5 min-w-0">
          <ShoppingBag className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-200 truncate">{order.product_title}</p>
            <p className="text-[11px] text-zinc-500 font-mono truncate">Order #{order.id} · {new Date(order.created_at).toLocaleDateString("en-US")}</p>
          </div>
        </div>
        <span className="font-mono font-semibold text-zinc-100 shrink-0">${order.total_amount.toFixed(2)}</span>
      </button>
      {isOpen && (
        <div className="mt-2 pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
          <span>Status <strong className="block text-zinc-200 capitalize">{order.status}</strong></span>
          <span>Source <strong className="block text-zinc-200">{order.order_source.replace("_", " ")}</strong></span>
          <span>Quantity <strong className="block text-zinc-200">Not stored</strong></span>
          <span>Created <strong className="block text-zinc-200">{new Date(order.created_at).toLocaleString("en-US")}</strong></span>
          <span>Lead record <strong className="block text-zinc-200 font-mono">{order.lead_id.slice(0, 8)}…</strong></span>
        </div>
      )}
    </div>
  );
}
