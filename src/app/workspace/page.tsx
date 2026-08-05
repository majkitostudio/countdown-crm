"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Lead, getLeads } from "@/lib/leads";
import { Product, getProducts } from "@/lib/products";
import { OperatorStatus } from "@/components/layout/Sidebar";
import { CallStatusBar } from "@/components/workspace/CallStatusBar";
import { CustomerPanel } from "@/components/workspace/CustomerPanel";
import { AiCopilotPanel } from "@/components/workspace/AiCopilotPanel";
import { ProductOrderPanel } from "@/components/workspace/ProductOrderPanel";
import { IncomingCallModal } from "@/components/workspace/IncomingCallModal";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { addCallRecord } from "@/lib/calls";
import { sounds } from "@/lib/audio";
import { workflowEngine } from "@/lib/workflows/engine";
import { ExecutionLogEntry } from "@/lib/workflows/types";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus>("ready");
  
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isDialing, setIsDialing] = useState<boolean>(false);
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState<boolean>(false);
  
  const [appliedPitch, setAppliedPitch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [postCallResults, setPostCallResults] = useState<ExecutionLogEntry[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const fetchedLeads = await getLeads();
      const fetchedProducts = await getProducts();

      setLeads(fetchedLeads);
      setProducts(fetchedProducts);

      if (leadIdParam) {
        const found = fetchedLeads.find((l) => l.id === leadIdParam);
        if (found) setActiveLead(found);
        else if (fetchedLeads.length > 0) setActiveLead(fetchedLeads[0]);
      } else if (fetchedLeads.length > 0) {
        setActiveLead(fetchedLeads[0]);
      }

      setIsLoading(false);
    }
    loadData();
  }, [leadIdParam]);

  // Outbound call toggle flow (Dialing -> Audio Ringtone -> Connected)
  const handleToggleCall = () => {
    if (isCallActive || isDialing) {
      // Hang up — emit workflow event and save call record
      setIsCallActive(false);
      setIsDialing(false);
      setOperatorStatus("ready");
      sounds.playCallEndSound();

      if (activeLead) {
        const newCallId = `call-${Date.now()}`;
        addCallRecord({
          id: newCallId,
          lead_id: activeLead.id,
          lead_name: activeLead.full_name,
          agent_name: "Jan Dvořák",
          duration_seconds: 145,
          outcome: "followup_scheduled",
          sentiment: "Positive",
          order_value: 0,
          transcript: [
            { speaker: "agent", text: `Outbound call to ${activeLead.full_name}`, timestamp: new Date().toLocaleTimeString() },
            { speaker: "customer", text: "Customer responded and agreed on follow-up.", timestamp: new Date().toLocaleTimeString() }
          ]
        });

        // Emit workflow engine event
        workflowEngine.emit("on_call_ended", {
          callId: newCallId,
          leadId: activeLead.id,
          leadName: activeLead.full_name,
          agentName: "Jan Dvořák",
          outcome: "followup_scheduled",
          sentiment: "Neutral",
          orderValue: 0,
          transcript: "Call ended by operator",
        }).then((results) => {
          if (results.length > 0) {
            setPostCallResults(results);
          }
        });
      }
    } else {

      // Start Outbound Call
      setIsDialing(true);
      setOperatorStatus("in_call");
      const stopTone = sounds.playDialTone();

      // Connect call after 2.5s simulation
      setTimeout(() => {
        stopTone();
        setIsDialing(false);
        setIsCallActive(true);
      }, 2500);
    }
  };

  // Simulate Incoming Call Trigger
  const handleSimulateIncoming = () => {
    if (leads.length > 1) {
      // pick second lead or random
      const targetLead = leads[1] || leads[0];
      setActiveLead(targetLead);
    }
    setIsIncomingCallOpen(true);
    const stopRingtone = sounds.playRingtone();

    // Store stopRingtone in window or ref for cleanup
    (window as unknown as { _stopRingtone?: () => void })._stopRingtone = stopRingtone;
  };

  const handleAcceptIncomingCall = () => {
    if ((window as unknown as { _stopRingtone?: () => void })._stopRingtone) {
      (window as unknown as { _stopRingtone?: () => void })._stopRingtone!();
    }
    setIsIncomingCallOpen(false);
    setIsCallActive(true);
    setIsDialing(false);
    setOperatorStatus("in_call");
  };

  const handleDeclineIncomingCall = () => {
    if ((window as unknown as { _stopRingtone?: () => void })._stopRingtone) {
      (window as unknown as { _stopRingtone?: () => void })._stopRingtone!();
    }
    setIsIncomingCallOpen(false);
    sounds.playCallEndSound();
  };

  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const advanceToNextLead = () => {
    if (!activeLead || leads.length === 0) return;
    const currentIndex = leads.findIndex((l) => l.id === activeLead.id);
    const nextIndex = (currentIndex + 1) % leads.length;
    setActiveLead(leads[nextIndex]);
  };

  const handleCallOutcome = (outcome: "call_later" | "schedule" | "fail" | "order") => {
    setIsCallActive(false);
    setIsDialing(false);
    setOperatorStatus("ready");

    let toastText = "";
    let callOutcome = "followup_scheduled";
    switch (outcome) {
      case "call_later":
        toastText = `Označeno: Nezvedá (Call Later) — Načítám dalšího zákazníka...`;
        sounds.playCallEndSound();
        advanceToNextLead();
        callOutcome = "no_answer";
        break;
      case "schedule":
        toastText = `Označeno: Naplánovat hovor (Callback) — Zápis do kalendáře...`;
        sounds.playCallEndSound();
        advanceToNextLead();
        callOutcome = "followup_scheduled";
        break;
      case "fail":
        toastText = `Označeno: Odmítnuto (Fail) — Lead uzavřen. Načítám dalšího...`;
        sounds.playCallEndSound();
        advanceToNextLead();
        callOutcome = "objection_handled";
        break;
      case "order":
        toastText = `Zákazník projevuje zájem! Vyberte produkt v pravém panelu pro 1-click objednávku.`;
        sounds.playSuccessSound();
        callOutcome = "order_placed";
        break;
    }

    // Emit workflow engine event
    if (activeLead) {
      workflowEngine.emit("on_call_ended", {
        callId: `call-${Date.now()}`,
        leadId: activeLead.id,
        leadName: activeLead.full_name,
        agentName: "Operator",
        outcome: callOutcome,
        sentiment: outcome === "order" ? "Positive" : "Neutral",
        orderValue: outcome === "order" ? (activeLead.value || 0) : 0,
        transcript: `Call outcome: ${outcome}`,
      }).then((results) => {
        if (results.length > 0) {
          setPostCallResults(results);
        }
      });
    }

    setNotificationToast(toastText);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  const handleOrderPlaced = (productId: string, totalAmount: number) => {
    console.log(`Order placed for lead ${activeLead?.full_name}: Product ${productId}, total $${totalAmount}`);
    sounds.playSuccessSound();
    setNotificationToast(`Objednávka ($${totalAmount}) byla úspěšně vytvořena! Načítám dalšího zákazníka...`);
    setTimeout(() => {
      setNotificationToast(null);
      advanceToNextLead();
    }, 2000);
  };

  const handleApplyPitch = (pitchText: string) => {
    setAppliedPitch(pitchText);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-zinc-300" />
        <span>Loading Agent Workspace Environment...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Toast Notification Banner */}
      {notificationToast && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <span>{notificationToast}</span>
          <button onClick={() => setNotificationToast(null)} className="text-zinc-400 hover:text-zinc-200 text-xs">✕</button>
        </div>
      )}

      {/* Post-Call Workflow Automation Results */}
      {postCallResults.length > 0 && (
        <PostCallSummaryCard
          entries={postCallResults}
          onDismiss={() => setPostCallResults([])}
        />
      )}

      {/* Top Status & Call Controller Bar */}
      <CallStatusBar
        status={operatorStatus}
        isCallActive={isCallActive}
        isDialing={isDialing}
        activeLeadName={activeLead?.full_name}
        activeLeadPhone={activeLead?.phone}
        onToggleCall={handleToggleCall}
        onSimulateIncoming={handleSimulateIncoming}
        onStatusChange={(newStatus) => {
          setOperatorStatus(newStatus);
          if (newStatus === "in_call") setIsCallActive(true);
          else setIsCallActive(false);
        }}
        onCallOutcome={handleCallOutcome}
      />

      {/* Main 3-Column Operator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[720px]">
        
        {/* Left Column: Customer Details & Timeline (3 cols) */}
        <div className="lg:col-span-3 h-full">
          <CustomerPanel
            leads={leads}
            activeLead={activeLead}
            onSelectLead={(lead) => setActiveLead(lead)}
          />
        </div>

        {/* Middle Column: AI Copilot & Speech Transcript (5 cols) */}
        <div className="lg:col-span-5 h-full">
          <AiCopilotPanel
            isCallActive={isCallActive}
            activeLead={activeLead}
            onApplyPitch={handleApplyPitch}
          />
        </div>

        {/* Right Column: Recommended Products & One-Click Order (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <ProductOrderPanel
            products={products}
            activeLead={activeLead}
            appliedPitch={appliedPitch}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>

      </div>

      {/* Incoming Call Simulation Modal */}
      <IncomingCallModal
        lead={activeLead}
        isOpen={isIncomingCallOpen}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-zinc-300" />
        <span>Loading Workspace...</span>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
