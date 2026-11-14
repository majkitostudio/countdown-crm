"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  History,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";
import { OperatorCallControls } from "@/components/workspace/OperatorCallControls";
import { Lead } from "@/lib/leads";
import { Order } from "@/lib/orders";
import { CustomerTimelineCard } from "@/components/workspace/CustomerTimelineCard";
import { formatCurrencyAmount } from "@/lib/currency";
import type { TelephonyAdapter } from "@/lib/telephony/telephonyAdapterShared";

interface CustomerPanelProps {
  leads: Lead[];
  activeLead: Lead | null;
  orders: Order[];
  activityRefreshToken: number;
  onCreateOrder: () => void;
  queueControlled?: boolean;
  canCreateOrder?: boolean;
  isCallActive: boolean;
  isDialing: boolean;
  durationSeconds: number;
  isMuted: boolean;
  onToggleCall: () => void;
  onToggleMute: () => void;
  onCallOutcome: (outcome: CallOutcome) => void;
  onScheduleCall: () => void;
  onSimulateIncoming?: () => void;
  isStarting?: boolean;
  telephonyAdapter?: TelephonyAdapter;
  showTimeline?: boolean;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

export function CustomerPanel({
  leads,
  activeLead,
  orders,
  activityRefreshToken,
  onCreateOrder,
  queueControlled = false,
  canCreateOrder = true,
  isCallActive,
  isDialing,
  durationSeconds,
  isMuted,
  onToggleCall,
  onToggleMute,
  onCallOutcome,
  onScheduleCall,
  onSimulateIncoming,
  isStarting = false,
  telephonyAdapter = "simulation",
  showTimeline = true,
}: CustomerPanelProps) {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadCustomerOrders() {
      if (activeLead) {
        const phone = normalizePhone(activeLead.phone);
        const matchingLeadIds = new Set(
          leads.filter((lead) => normalizePhone(lead.phone) === phone).map((lead) => lead.id)
        );
        setCustomerOrders(orders.filter((order) => matchingLeadIds.has(order.lead_id)));
      }
    }
    loadCustomerOrders();
  }, [activeLead, leads, orders, activityRefreshToken]);

  if (!activeLead) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-6 text-center text-zinc-500 text-xs">
        Není vybrán žádný aktivní zákazník. Vyberte lead z databáze.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-5 flex flex-col h-full overflow-y-auto">
      
      {/* Current lead header */}
      <div className="space-y-2 border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Aktuální lead</span>
          {queueControlled && <span className="text-[10px] text-zinc-600">Přiřazen z fronty</span>}
        </div>
        <p className="text-[11px] text-zinc-500">
          {queueControlled ? "Další kontakt vybírá směrování na serveru." : "Kontext leadu je vybrán podle adresy pracovního prostoru."}
        </p>
      </div>

      {/* Customer profile and call controls */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div>
            <h2 className="truncate text-lg font-semibold text-zinc-100">{activeLead.full_name}</h2>
            <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5 text-zinc-500" />
              <span>{activeLead.company || "Bez společnosti"}</span>
            </div>
          </div>
        </div>
        {canCreateOrder && (
          <button
            type="button"
            onClick={onCreateOrder}
            className="shrink-0 px-2.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors duration-150 ease-interface"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Vytvořit objednávku</span>
          </button>
        )}
      </div>

      {/* Quick Info Grid */}
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-400" /> Telefon
          </span>
          <span className="font-mono text-zinc-200 font-medium">{activeLead.phone}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-400" /> E-mail
          </span>
          <span className="text-zinc-200 font-medium truncate max-w-[170px]">{activeLead.email || "Neuvedeno"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Zdroj
          </span>
          <span className="text-zinc-500 font-medium">Zdroj není dostupný</span>
        </div>

      </div>

      <OperatorCallControls
        isCallActive={isCallActive}
        isDialing={isDialing}
        durationSeconds={durationSeconds}
        isMuted={isMuted}
        onToggleCall={onToggleCall}
        onToggleMute={onToggleMute}
        onCallOutcome={onCallOutcome}
        onScheduleCall={onScheduleCall}
        onSimulateIncoming={onSimulateIncoming}
        isStarting={isStarting}
        telephonyAdapter={telephonyAdapter}
      />

      {/* Lead Timeline */}
      {showTimeline && <CustomerTimelineCard leadId={activeLead.id} refreshToken={activityRefreshToken} />}

      {/* Historical Purchases & Activity */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-zinc-400" />
            Historie zákazníka ({customerOrders.length})
          </h3>
        </div>
        <p className="text-[10px] text-zinc-500">Podle tohoto telefonního čísla napříč leady pracovního prostoru. Kontakty se neslučují.</p>

        <div className="space-y-2 text-xs">
          {customerOrders.length === 0 ? (
            <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs">
              Pro toto telefonní číslo nebyly nalezeny žádné předchozí objednávky.
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
      <div className="w-full flex items-start justify-between gap-2 text-left">
        <div className="flex items-start gap-2.5 min-w-0">
          <ShoppingBag className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <Link href={`/orders/${order.id}`} className="block truncate font-semibold text-zinc-200 hover:text-white">{order.product_title}</Link>
            <Link href={`/orders/${order.id}`} className="block truncate text-[11px] font-mono text-zinc-500 hover:text-zinc-300">Objednávka #{order.id} · {new Date(order.created_at).toLocaleDateString("cs-CZ")}</Link>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono font-semibold text-zinc-100">{formatCurrencyAmount(order.total_amount, order.currency)}</span>
          <button type="button" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} aria-label={isOpen ? "Skrýt podrobnosti objednávky" : "Zobrazit podrobnosti objednávky"} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ease-interface ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-2 pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
          <span>Stav <strong className="block text-zinc-200 capitalize">{({ completed: "Dokončeno", pending: "Čeká na zpracování", in_progress: "Zpracovává se", sent: "Odesláno", cancelled: "Zrušeno", delivered: "Doručeno", returned: "Vráceno" })[order.status]}</strong></span>
          <span>Zdroj <strong className="block text-zinc-200">{({ previous_call: "Předchozí hovor", email: "E-mail", web_form: "Webový formulář", manual: "Ruční záznam", other: "Jiný" })[order.order_source]}</strong></span>
          <span>Množství <strong className="block text-zinc-200">Neuloženo</strong></span>
          <span>Vytvořeno <strong className="block text-zinc-200">{new Date(order.created_at).toLocaleString("cs-CZ")}</strong></span>
          <span>Záznam leadu <strong className="block text-zinc-200 font-mono">{order.lead_id.slice(0, 8)}…</strong></span>
        </div>
      )}
    </div>
  );
}
