"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Lead, getLeads } from "@/lib/leads";
import { Product, getProducts } from "@/lib/products";
import { Order, getOrders } from "@/lib/orders";
import { OperatorStatus } from "@/components/layout/Sidebar";
import { CallStatusBar, CallOutcome } from "@/components/workspace/CallStatusBar";
import { CustomerPanel } from "@/components/workspace/CustomerPanel";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";
import { ProductOrderPanel } from "@/components/workspace/ProductOrderPanel";
import { IncomingCallModal } from "@/components/workspace/IncomingCallModal";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { CallRecord } from "@/lib/calls";
import { sounds } from "@/lib/audio";
import { workflowEngine } from "@/lib/workflows/engine";
import { fetchWorkflowsFromSupabase } from "@/lib/supabase/workflowService";
import { ExecutionLogEntry } from "@/lib/workflows/types";
import { softphoneController } from "@/lib/telephony/softphone";
import { completeCallAction } from "@/app/actions/crm";

interface PostCallSummary {
  leadName: string;
  outcomeLabel: string;
  durationSeconds: number;
  orderStatus: "created" | "not_created";
  transcriptStatus: "unavailable";
  orderId?: string;
  workflowEntries: ExecutionLogEntry[];
}

interface OrderPlacementResult {
  orderId: string;
  callCompleted: boolean;
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus>("ready");
  
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isDialing, setIsDialing] = useState<boolean>(false);
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState<boolean>(false);
  
  const [appliedPitch, setAppliedPitch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postCallSummary, setPostCallSummary] = useState<PostCallSummary | null>(null);
  const [isOrderFlowOpen, setIsOrderFlowOpen] = useState(false);
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const stopAudioRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [fetchedLeads, fetchedProducts, fetchedOrders, fetchedWorkflows] = await Promise.all([
          getLeads(),
          getProducts(),
          getOrders(),
          fetchWorkflowsFromSupabase(),
        ]);

        setLeads(fetchedLeads);
        setProducts(fetchedProducts);
        setOrders(fetchedOrders);
        workflowEngine.replaceRules(fetchedWorkflows);

        if (leadIdParam) {
          const found = fetchedLeads.find((l) => l.id === leadIdParam);
          if (found) setActiveLead(found);
          else if (fetchedLeads.length > 0) setActiveLead(fetchedLeads[0]);
        } else if (fetchedLeads.length > 0) {
          setActiveLead(fetchedLeads[0]);
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Workspace data could not be loaded");
      }
      setIsLoading(false);
    }
    loadData();
  }, [leadIdParam]);

  const completeCall = async (
    outcome: CallRecord["outcome"],
    outcomeLabel: string,
    orderStatus: PostCallSummary["orderStatus"],
    orderValue = 0,
    orderProductId?: string,
  ): Promise<{ callId: string; orderId?: string } | null> => {
    if (!activeLead) return null;

    softphoneController.hangup();
    setIsCallActive(false);
    setIsDialing(false);
    setIsOrderFlowOpen(false);
    setOperatorStatus("ready");
    sounds.playCallEndSound();

    try {
      const completion = await completeCallAction({
        lead_id: activeLead.id,
        duration_seconds: 145,
        outcome,
        ai_sentiment: orderStatus === "created" ? "Positive" : "Neutral",
        order_product_id: orderProductId,
        order_total_amount: orderProductId ? orderValue : null,
        transcript: null,
      });

      const savedLead = { ...activeLead, status: completion.lead_status, updated_at: new Date().toISOString() };
      setActiveLead(savedLead);
      setLeads((currentLeads) =>
        currentLeads.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
      );
      try {
        setOrders(await getOrders());
      } catch {
        setNotificationToast("Call saved, but customer order history could not be refreshed.");
      }

      let workflowEntries: ExecutionLogEntry[] = [];
      try {
        workflowEntries = await workflowEngine.emit("on_call_ended", {
        callId: completion.call_id,
        leadId: activeLead.id,
        leadName: activeLead.full_name,
        agentName: "Jan Dvořák",
        outcome,
        sentiment: orderStatus === "created" ? "Positive" : "Neutral",
        orderValue,
          transcript: "Call ended by operator",
        });
      } catch (workflowError) {
        setNotificationToast(
          workflowError instanceof Error
            ? `Call and order saved, but automation failed: ${workflowError.message}`
            : "Call and order saved, but automation failed."
        );
      }

      setPostCallSummary({
        leadName: activeLead.full_name,
        outcomeLabel,
        durationSeconds: 145,
        orderStatus,
        transcriptStatus: "unavailable",
        orderId: completion.order_id || undefined,
        workflowEntries,
      });
      setActivityRefreshToken((current) => current + 1);
      return { callId: completion.call_id, orderId: completion.order_id || undefined };
    } catch (error) {
      setPostCallSummary(null);
      setNotificationToast(
        error instanceof Error
          ? `Call completion failed: ${error.message}`
          : "Call completion failed. No successful summary was recorded."
      );
      return null;
    }
  };

  // Outbound call toggle flow (Dialing -> Audio Ringtone -> Connected)
  const handleToggleCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }

    if (isCallActive || isDialing) {
      void completeCall("followup_scheduled", "Follow-up scheduled", "not_created");
    } else {
      // Start Outbound Call
      if (activeLead) {
        softphoneController.dial(activeLead.id, activeLead.phone, activeLead.full_name);
      }
      setIsDialing(true);
      setOperatorStatus("in_call");
      const stopTone = sounds.playDialTone();
      stopAudioRef.current = stopTone;

      // Connect call after 2.5s simulation
      setTimeout(() => {
        if (stopAudioRef.current) {
          stopAudioRef.current();
          stopAudioRef.current = null;
        }
        setIsDialing(false);
        setIsCallActive(true);
      }, 2500);
    }
  };

  // Simulate Incoming Call Trigger
  const handleSimulateIncoming = () => {
    if (leads.length > 1) {
      const targetLead = leads[1] || leads[0];
      setActiveLead(targetLead);
    }
    setIsIncomingCallOpen(true);
    const stopRingtone = sounds.playRingtone();
    stopAudioRef.current = stopRingtone;
  };

  const handleAcceptIncomingCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    setIsIncomingCallOpen(false);
    setIsCallActive(true);
    setIsDialing(false);
    setOperatorStatus("in_call");
  };

  const handleDeclineIncomingCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
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

  const handleCallOutcome = (outcome: CallOutcome) => {
    if (outcome === "order") {
      setIsOrderFlowOpen(true);
      setNotificationToast("Order flow unlocked. Review the product and place the order when ready.");
      return;
    }

    const outcomeConfig: Record<Exclude<CallOutcome, "order">, [CallRecord["outcome"], string]> = {
      call_later: ["no_answer", "No answer"],
      schedule: ["followup_scheduled", "Follow-up scheduled"],
      fail: ["objection_handled", "Not interested"],
    };
    const [callOutcome, outcomeLabel] = outcomeConfig[outcome];
    void completeCall(callOutcome, outcomeLabel, "not_created");
  };

  const handleOrderPlaced = async (
    productId: string,
    totalAmount: number
  ): Promise<OrderPlacementResult | null> => {
    if (!activeLead) return null;

    try {
      const completion = await completeCall(
        "order_placed",
        "Order placed",
        "created",
        totalAmount,
        productId
      );
      if (!completion?.orderId) return null;
      return { orderId: completion.orderId, callCompleted: true };
    } catch (error) {
      setNotificationToast(
        error instanceof Error
          ? `Order creation failed: ${error.message}`
          : "Order creation failed. Nothing was recorded."
      );
      return null;
    }
  };

  const handleNextLead = () => {
    setPostCallSummary(null);
    setNotificationToast(null);
    advanceToNextLead();
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

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-sm text-rose-200">
        <h1 className="font-semibold">Workspace data could not be loaded</h1>
        <p className="mt-2 text-xs text-rose-300">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Toast Notification Banner */}
      {notificationToast && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300" role="status" aria-live="polite">
          <span>{notificationToast}</span>
          <button onClick={() => setNotificationToast(null)} aria-label="Dismiss notification" className="text-zinc-400 hover:text-zinc-200 text-xs">✕</button>
        </div>
      )}

      {/* Post-Call Summary */}
      {postCallSummary && (
        <PostCallSummaryCard
          summary={postCallSummary}
          onDismiss={() => setPostCallSummary(null)}
          onNextLead={handleNextLead}
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
            orders={orders}
            activityRefreshToken={activityRefreshToken}
            onSelectLead={(lead) => setActiveLead(lead)}
          />
        </div>

        {/* Middle Column: Product script and contextual AI suggestion */}
        <div className="lg:col-span-5 h-full">
          <ProductScriptPanel
            isCallActive={isCallActive}
            product={products[0]}
            onApplyPitch={handleApplyPitch}
          />
        </div>

        {/* Right Column: Recommended Products & One-Click Order (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <ProductOrderPanel
          products={products}
          activeLead={activeLead}
          isOrderFlowOpen={isOrderFlowOpen}
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
