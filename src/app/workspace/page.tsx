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
import { sounds } from "@/lib/audio";

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
      // Hang up
      setIsCallActive(false);
      setIsDialing(false);
      setOperatorStatus("ready");
      sounds.playCallEndSound();
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

  const handleOrderPlaced = (productId: string, totalAmount: number) => {
    console.log(`Order placed for lead ${activeLead?.full_name}: Product ${productId}, total $${totalAmount}`);
  };

  const handleApplyPitch = (pitchText: string) => {
    setAppliedPitch(pitchText);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        <span>Loading Agent Workspace Environment...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      
      {/* Top Status & Call Controller Bar */}
      <CallStatusBar
        status={operatorStatus}
        isCallActive={isCallActive}
        isDialing={isDialing}
        activeLeadName={activeLead?.full_name}
        onToggleCall={handleToggleCall}
        onSimulateIncoming={handleSimulateIncoming}
        onStatusChange={(newStatus) => {
          setOperatorStatus(newStatus);
          if (newStatus === "in_call") setIsCallActive(true);
          else setIsCallActive(false);
        }}
      />

      {/* Main 3-Column Operator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[680px]">
        
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
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        <span>Loading Workspace...</span>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
