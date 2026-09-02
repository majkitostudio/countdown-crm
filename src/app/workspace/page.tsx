"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneCall, RefreshCw } from "lucide-react";
import { Lead, getLeads } from "@/lib/leads";
import { Product, getProducts } from "@/lib/products";
import { getProductScript } from "@/lib/productScripts";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";
import { AdditionalQuestionsCard } from "@/components/workspace/AdditionalQuestionsCard";
import { CustomerTimelineCard } from "@/components/workspace/CustomerTimelineCard";
import { LeadNotesCard } from "@/components/workspace/LeadNotesCard";
import { OperatorLeadHeader } from "@/components/workspace/OperatorLeadHeader";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";
import { ProductOrderPanel, type OrderPlacementResult } from "@/components/workspace/ProductOrderPanel";
import { IncomingCallModal } from "@/components/workspace/IncomingCallModal";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { CallbackScheduleModal } from "@/components/workspace/CallbackScheduleModal";
import type { CompletionOutcome } from "@/lib/dal/callCompletion";
import type { LeadQueueSnapshot } from "@/lib/dal/leadQueue";
import { sounds } from "@/lib/audio";
import { ExecutionLogEntry, WorkflowDispatchResult } from "@/lib/workflows/types";
import { softphoneController, type CallSession } from "@/lib/telephony/softphone";
import { OperationTimeoutError, withTimeout } from "@/lib/withTimeout";
import { completeCallAction } from "@/app/actions/crm";
import { totalCallOrderItems, type CallOrderItemInput } from "@/lib/callOrder";
import { listLeadNotesAction } from "@/app/actions/leadNotes";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";
import {
  abortLeadCallStartAction,
  claimNextLeadAction,
  completeLeadCallAction,
  endLeadCallAction,
  getCurrentLeadAction,
  heartbeatLeadAssignmentAction,
  setOperatorPresenceAction,
  startLeadCallAction,
} from "@/app/actions/leadQueue";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import { PageHeader } from "@/components/layout/PageHeader";

interface PostCallSummary {
  leadName: string;
  outcomeLabel: string;
  durationSeconds: number;
  orderStatus: "created" | "not_created";
  transcriptStatus: "unavailable";
  orderId?: string;
  workflowEntries: ExecutionLogEntry[];
  workflowDispatches: WorkflowDispatchResult[];
}

const CALL_START_SERVER_TIMEOUT_MS = 10_000;

type OperatorConsoleState =
  | "loading"
  | "load_error"
  | "waiting_assignment"
  | "ready"
  | "dialing"
  | "in_call"
  | "awaiting_outcome"
  | "callback_modal"
  | "completion_pending"
  | "recovery_required"
  | "post_call_summary";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("leadId");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(null);
  const [assignmentState, setAssignmentState] = useState<LeadQueueSnapshot["assignment_state"] | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postCallSummary, setPostCallSummary] = useState<PostCallSummary | null>(null);
  const [orderFlowMode, setOrderFlowMode] = useState<"call" | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNoteDTO[]>([]);
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [isCallbackScheduleOpen, setIsCallbackScheduleOpen] = useState(false);
  const [isCallbackSchedulePending, setIsCallbackSchedulePending] = useState(false);
  const [callbackScheduleError, setCallbackScheduleError] = useState<string | null>(null);
  const [isCallStartPending, setIsCallStartPending] = useState(false);
  const [isEndCallPending, setIsEndCallPending] = useState(false);
  const [isCompletionPending, setIsCompletionPending] = useState(false);
  const [softphoneSession, setSoftphoneSession] = useState<CallSession>(() => softphoneController.getSession());
  const stopAudioRef = React.useRef<(() => void) | null>(null);
  const callStartPendingRef = React.useRef(false);
  const callStartRecoveryRef = React.useRef(false);
  const completionInFlightRef = React.useRef(false);
  const activeQueueItemIdRef = React.useRef<string | null>(null);
  const identityRoleRef = React.useRef<string | null>(null);
  const { identity, isLoading: isIdentityLoading } = useOperatorIdentity();
  const activeLeadId = activeLead?.id;

  const isDialing = softphoneSession.state === "dialing" || softphoneSession.state === "ringing";
  const isCallActive = softphoneSession.state === "connected" || softphoneSession.state === "on_hold";
  const isAwaitingOutcome = assignmentState === "awaiting_outcome";
  const callStartedAt = isCallActive && softphoneSession.startTime
    ? softphoneSession.startTime.toISOString()
    : null;

  useEffect(() => {
    activeQueueItemIdRef.current = activeQueueItemId;
    identityRoleRef.current = identity?.role || null;
  }, [activeQueueItemId, identity?.role]);

  useEffect(() => softphoneController.subscribeState(setSoftphoneSession), []);

  useEffect(() => {
    return () => {
      const currentSession = softphoneController.getSession();
      if (currentSession.state === "dialing" || currentSession.state === "ringing") {
        softphoneController.cancelDial();
        const queueItemId = activeQueueItemIdRef.current;
        if (identityRoleRef.current === "operator" && queueItemId) {
          void abortLeadCallStartAction(queueItemId, "Operator workspace unmounted during call start").catch(() => {
            // The lease recovery path remains the server-side fallback if the page is already gone.
          });
        }
      } else if (currentSession.state !== "idle" && currentSession.state !== "ended") {
        softphoneController.hangup();
      }
    };
  }, []);

  useEffect(() => {
    if (!isDialing && !isCallActive && stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
  }, [isCallActive, isDialing]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeadNotes() {
      if (!activeLeadId) {
        setLeadNotes([]);
        return;
      }

      try {
        const notes = await listLeadNotesAction(activeLeadId);
        if (!cancelled) setLeadNotes(notes);
      } catch (error) {
        if (!cancelled) {
          setLeadNotes([]);
          setNotificationToast(error instanceof Error ? error.message : "Lead notes could not be loaded.");
        }
      }
    }

    void loadLeadNotes();
    return () => {
      cancelled = true;
    };
  }, [activeLeadId, activityRefreshToken]);

  useEffect(() => {
    if (identity?.role !== "operator" || !activeQueueItemId) return;

    const sendHeartbeat = () => {
      void heartbeatLeadAssignmentAction(activeQueueItemId).catch((error) => {
        setNotificationToast(error instanceof Error ? error.message : "Lead assignment heartbeat failed.");
      });
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [activeQueueItemId, identity?.role]);

  useEffect(() => {
    if (isIdentityLoading) return;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (!identity) {
          throw new Error("Authenticated workspace role is unavailable");
        }

        if (identity.role === "operator") {
          const fetchedProducts = await getProducts();
          let currentAssignment = await getCurrentLeadAction();

          if (!currentAssignment) {
            await setOperatorPresenceAction("available");
            currentAssignment = await claimNextLeadAction();
          }

          setProducts(fetchedProducts);
          setLeads(currentAssignment ? [currentAssignment.lead] : []);
          setActiveLead(currentAssignment?.lead || null);
          setActiveQueueItemId(currentAssignment?.queue_item_id || null);
          setAssignmentState(currentAssignment?.assignment_state || null);
          setRecoveryRequired(currentAssignment?.recovery_required || false);
          setCallDurationSeconds(
            currentAssignment?.call_started_at
              ? Math.max(0, Math.round((Date.parse(currentAssignment.call_ended_at || new Date().toISOString()) - Date.parse(currentAssignment.call_started_at)) / 1000))
              : 0,
          );
          setIsLoading(false);
          return;
        }

        const [fetchedLeads, fetchedProducts] = await Promise.all([
          getLeads(),
          getProducts(),
        ]);

        setLeads(fetchedLeads);
        setProducts(fetchedProducts);
        setActiveQueueItemId(null);
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
  }, [identity, isIdentityLoading, leadIdParam]);

  const completeCall = async (
    outcome: CompletionOutcome,
    outcomeLabel: string,
    orderStatus: PostCallSummary["orderStatus"],
    orderValue = 0,
    orderProductId?: string,
    callbackScheduledAt?: string,
    orderItems?: CallOrderItemInput[],
  ): Promise<{ callId: string; orderId?: string } | null> => {
    if (!activeLead || completionInFlightRef.current) return null;

    completionInFlightRef.current = true;
    setIsCompletionPending(true);
    const durationSeconds = callDurationSeconds || (callStartedAt
      ? Math.max(0, Math.round((Date.parse(new Date().toISOString()) - Date.parse(callStartedAt)) / 1000))
      : softphoneSession.durationSeconds);
    try {
      if (identity?.role === "operator") {
        if (!activeQueueItemId) {
          throw new Error("No active server assignment is available for call completion");
        }

        const queueOutcome = outcome === "objection_handled" ? "objection" : outcome;
        const completion = await completeLeadCallAction({
          queue_item_id: activeQueueItemId,
          duration_seconds: durationSeconds,
          outcome: queueOutcome,
          ai_sentiment: orderStatus === "created" ? "Positive" : "Neutral",
          order_items: orderItems || null,
          order_product_id: orderProductId || null,
          order_total_amount: orderProductId ? orderValue : null,
          transcript: null,
          callback_scheduled_at: queueOutcome === "followup_scheduled" ? callbackScheduledAt || null : null,
        });

        const nextAssignment = completion.next_lead;
        softphoneController.hangup();
        setOrderFlowMode(null);
        setNotificationToast(null);
        sounds.playCallEndSound();
        setActiveQueueItemId(nextAssignment?.queue_item_id || null);
        setAssignmentState(nextAssignment?.assignment_state || null);
        setRecoveryRequired(nextAssignment?.recovery_required || false);
        setCallDurationSeconds(0);
        setActiveLead(nextAssignment?.lead || null);
        setLeads(nextAssignment ? [nextAssignment.lead] : []);

        const workflowEntries = completion.workflowDispatches.flatMap((dispatch) => dispatch.entries);
        setPostCallSummary({
          leadName: activeLead.full_name,
          outcomeLabel,
          durationSeconds: completion.duration_seconds,
          orderStatus,
          transcriptStatus: "unavailable",
          orderId: completion.order_id || undefined,
          workflowEntries,
          workflowDispatches: completion.workflowDispatches,
        });
        setActivityRefreshToken((current) => current + 1);
        return { callId: completion.call_id, orderId: completion.order_id || undefined };
      }

      const completion = await completeCallAction({
        lead_id: activeLead.id,
        duration_seconds: durationSeconds,
        outcome,
        ai_sentiment: orderStatus === "created" ? "Positive" : "Neutral",
        order_items: orderItems || null,
        order_product_id: orderProductId,
        order_total_amount: orderProductId ? orderValue : null,
        transcript: null,
      });

      softphoneController.hangup();
      setOrderFlowMode(null);
      setNotificationToast(null);
      sounds.playCallEndSound();

      const savedLead = { ...activeLead, status: completion.lead_status, updated_at: new Date().toISOString() };
      setActiveLead(savedLead);
      setLeads((currentLeads) =>
        currentLeads.map((lead) => (lead.id === savedLead.id ? savedLead : lead))
      );
      const workflowEntries = completion.workflowDispatches.flatMap((dispatch) => dispatch.entries);

      setPostCallSummary({
        leadName: activeLead.full_name,
        outcomeLabel,
        durationSeconds,
        orderStatus,
        transcriptStatus: "unavailable",
        orderId: completion.order_id || undefined,
        workflowEntries,
        workflowDispatches: completion.workflowDispatches,
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
    } finally {
      completionInFlightRef.current = false;
      setIsCompletionPending(false);
    }
  };

  // Outbound call toggle flow (Dialing -> Audio Ringtone -> Connected)
  const handleToggleCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }

    if (isDialing) {
      softphoneController.cancelDial();
      if (identity?.role === "operator" && activeQueueItemId) {
        void abortLeadCallStartAction(activeQueueItemId, "Operator cancelled call start")
          .then((assignment) => setAssignmentState(assignment.assignment_state))
          .catch((error) => setNotificationToast(error instanceof Error ? error.message : "Call start recovery failed."));
      }
      return;
    }

    if (isAwaitingOutcome) {
      setNotificationToast("Choose the post-call outcome before starting another call.");
      return;
    }

    if (isCallActive) {
      if (identity?.role === "operator") {
        if (!activeQueueItemId || isEndCallPending) return;
        const localDurationSeconds = softphoneSession.durationSeconds;
        setIsEndCallPending(true);
        void endLeadCallAction(activeQueueItemId)
          .then((endedAssignment) => {
            softphoneController.hangup();
            setAssignmentState(endedAssignment.assignment_state);
            setRecoveryRequired(endedAssignment.recovery_required);
            setCallDurationSeconds(
              localDurationSeconds || (endedAssignment.call_started_at
                ? Math.max(0, Math.round((Date.parse(endedAssignment.call_ended_at || new Date().toISOString()) - Date.parse(endedAssignment.call_started_at)) / 1000))
                : 0),
            );
            setNotificationToast(null);
          })
          .catch((error) => {
            setNotificationToast(error instanceof Error ? `Call could not be ended safely: ${error.message}` : "Call could not be ended safely.");
          })
          .finally(() => setIsEndCallPending(false));
        return;
      }

      setCallbackScheduleError(null);
      setIsCallbackScheduleOpen(true);
    } else {
      // Start Outbound Call
      if (!activeLead) {
        setNotificationToast("Select a lead before starting a call.");
        return;
      }

      if (identity?.role === "operator") {
        if (!activeQueueItemId) {
          setNotificationToast("No active server assignment is available for this call.");
          return;
        }
        if (assignmentState !== "assigned") {
          setNotificationToast("The server assignment requires recovery before another call can start.");
          return;
        }

        if (callStartPendingRef.current) return;
        if (callStartRecoveryRef.current) {
          setNotificationToast("Call start recovery is still in progress. Wait for it to finish or reload the workspace.");
          return;
        }
        callStartPendingRef.current = true;
        setIsCallStartPending(true);
        void (async () => {
          let queueCallStarted = false;
          let startRequest: Promise<LeadQueueSnapshot> | null = null;
          try {
            startRequest = startLeadCallAction(activeQueueItemId);
            const startedAssignment = await withTimeout(
              startRequest,
              CALL_START_SERVER_TIMEOUT_MS,
              "Server call start timed out; assignment recovery has been started",
            );
            queueCallStarted = true;
            if (startedAssignment.assignment_state !== "in_progress") {
              throw new Error("Server did not activate the lead assignment");
            }
            setActiveLead(startedAssignment.lead);
            setLeads([startedAssignment.lead]);
            setAssignmentState(startedAssignment.assignment_state);
            setRecoveryRequired(false);
            setCallDurationSeconds(0);
            const stopTone = sounds.playDialTone();
            stopAudioRef.current = stopTone;
            const audioReady = await withTimeout(
              softphoneController.dial(
                startedAssignment.lead.id,
                startedAssignment.lead.phone,
                startedAssignment.lead.full_name,
              ),
              CALL_START_SERVER_TIMEOUT_MS,
              "Audio initialization timed out",
            );
            if (!audioReady) throw new Error("Audio session could not be initialized");
          } catch (error) {
            let recoveryError: unknown = null;
            let recoveredAssignment: LeadQueueSnapshot | null = null;
            if (queueCallStarted) {
              try {
                recoveredAssignment = await abortLeadCallStartAction(activeQueueItemId, "Softphone start failed");
              } catch (errorDuringRecovery) {
                recoveryError = errorDuringRecovery;
              }
            } else if (startRequest && error instanceof OperationTimeoutError && error.message.includes("Server call start timed out")) {
              callStartRecoveryRef.current = true;
              void startRequest
                .then(
                  () => abortLeadCallStartAction(activeQueueItemId, "Server call start timed out"),
                  () => abortLeadCallStartAction(activeQueueItemId, "Server call start request failed after timeout"),
                )
                .then((recoveredAssignment) => {
                  setAssignmentState(recoveredAssignment.assignment_state);
                  setRecoveryRequired(recoveredAssignment.recovery_required);
                  setNotificationToast("Call start timed out, but the server assignment was recovered. You can try again.");
                })
                .catch(() => {
                  setNotificationToast("Call start timed out. Reload the workspace to recover the server assignment before retrying.");
                })
                .finally(() => {
                  callStartRecoveryRef.current = false;
                });
            }
            if (stopAudioRef.current) {
              stopAudioRef.current();
              stopAudioRef.current = null;
            }
            softphoneController.cancelDial();
            if (recoveredAssignment) {
              setAssignmentState(recoveredAssignment.assignment_state);
              setRecoveryRequired(recoveredAssignment.recovery_required);
            } else if (queueCallStarted) {
              setRecoveryRequired(true);
            }
            setNotificationToast(
              recoveryError instanceof Error
                ? `Call start recovery failed: ${recoveryError.message}. Reload the workspace before retrying.`
                : error instanceof Error
                  ? `Call could not be started: ${error.message}`
                  : "Call could not be started. No CRM activity was recorded."
            );
          } finally {
            callStartPendingRef.current = false;
            setIsCallStartPending(false);
          }
        })();
        return;
      }

      if (callStartPendingRef.current) return;
      callStartPendingRef.current = true;
      setIsCallStartPending(true);
      const stopTone = sounds.playDialTone();
      stopAudioRef.current = stopTone;

      void softphoneController.dial(activeLead.id, activeLead.phone, activeLead.full_name)
        .then((audioReady) => {
          if (!audioReady) throw new Error("Audio session could not be initialized");
        })
        .catch((error) => {
          if (stopAudioRef.current) {
            stopAudioRef.current();
            stopAudioRef.current = null;
          }
          softphoneController.cancelDial();
          setNotificationToast(
            error instanceof Error
              ? `Call could not be started: ${error.message}`
              : "Call could not be started. No CRM activity was recorded."
          );
        })
        .finally(() => {
          callStartPendingRef.current = false;
          setIsCallStartPending(false);
        });
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
    void softphoneController.answer()
      .then((audioReady) => {
        if (!audioReady) throw new Error("Audio session could not be initialized");
      })
      .catch((error) => {
        setNotificationToast(
          error instanceof Error
            ? `Incoming call could not be answered: ${error.message}`
            : "Incoming call could not be answered."
        );
      });
  };

  const handleDeclineIncomingCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    setIsIncomingCallOpen(false);
    sounds.playCallEndSound();
  };

  const advanceToNextLead = () => {
    if (!activeLead || leads.length === 0) return;
    const currentIndex = leads.findIndex((l) => l.id === activeLead.id);
    const nextIndex = (currentIndex + 1) % leads.length;
    setActiveLead(leads[nextIndex]);
  };

  const handleCallOutcome = (outcome: CallOutcome) => {
    if (!isAwaitingOutcome || completionInFlightRef.current) return;

    if (outcome === "order") {
      setOrderFlowMode("call");
      setNotificationToast("Order flow unlocked. Review the product and place the order when ready.");
      return;
    }

    if (outcome === "schedule") {
      setCallbackScheduleError(null);
      setIsCallbackScheduleOpen(true);
      return;
    }

    const outcomeConfig: Record<Exclude<CallOutcome, "order">, [CompletionOutcome, string]> = {
      call_later: ["no_answer", "No answer"],
      schedule: ["followup_scheduled", "Follow-up scheduled"],
      fail: ["objection_handled", "Not interested"],
    };
    const [callOutcome, outcomeLabel] = outcomeConfig[outcome];
    void completeCall(callOutcome, outcomeLabel, "not_created");
  };

  const handleScheduleCallback = async (scheduledAt: string) => {
    if (!isAwaitingOutcome) return;
    setIsCallbackSchedulePending(true);
    setCallbackScheduleError(null);
    const completion = await completeCall(
      "followup_scheduled",
      "Follow-up scheduled",
      "not_created",
      0,
      undefined,
      scheduledAt,
    );
    if (completion) {
      setIsCallbackScheduleOpen(false);
    } else {
      setCallbackScheduleError("Callback se nepodařilo uložit. Zkontrolujte aktivní assignment a zkuste to znovu.");
    }
    setIsCallbackSchedulePending(false);
  };

  const handleOrderPlaced = async (
    input: { items: CallOrderItemInput[] },
  ): Promise<OrderPlacementResult | null> => {
    if (!activeLead) return null;

    try {
      const firstItem = input.items[0];
      const totalAmount = totalCallOrderItems(input.items);
      const completion = await completeCall(
        "order_placed",
        "Order placed",
        "created",
        totalAmount,
        firstItem?.product_id,
        undefined,
        input.items,
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
    if (identity?.role !== "operator") {
      advanceToNextLead();
    }
  };

  const operatorConsoleState: OperatorConsoleState = isLoading
    ? "loading"
    : loadError
      ? "load_error"
      : postCallSummary
        ? "post_call_summary"
        : identity?.role === "operator" && !activeLead
          ? "waiting_assignment"
          : isCallbackScheduleOpen
            ? "callback_modal"
            : isCompletionPending
              ? "completion_pending"
              : recoveryRequired
                ? "recovery_required"
                : isAwaitingOutcome
                  ? "awaiting_outcome"
                  : isDialing
                    ? "dialing"
                    : isCallActive
                      ? "in_call"
                      : "ready";

  const pageHeaderBadge = {
    loading: { label: "Loading", tone: "neutral" as const },
    load_error: { label: "Unavailable", tone: "unavailable" as const },
    waiting_assignment: { label: "Waiting for assignment", tone: "neutral" as const },
    ready: { label: "Ready for assignment", tone: "neutral" as const },
    dialing: { label: "Dialing", tone: "neutral" as const },
    in_call: { label: "In call", tone: "neutral" as const },
    awaiting_outcome: { label: "Awaiting outcome", tone: "warning" as const },
    callback_modal: { label: "Callback", tone: "warning" as const },
    completion_pending: { label: "Saving outcome", tone: "warning" as const },
    recovery_required: { label: "Recovery required", tone: "warning" as const },
    post_call_summary: { label: "Call completed", tone: "neutral" as const },
  }[operatorConsoleState];

  const pageHeader = (
    <PageHeader
      icon={PhoneCall}
      title="Operator Console"
      description="Server-routed customer calls and approved workspace guidance. Operators never browse or choose from the lead directory."
      badge={pageHeaderBadge}
      className="p-4 sm:p-5"
    />
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-none space-y-4">
        {pageHeader}
        <div className="flex min-h-[400px] items-center justify-center text-xs text-zinc-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin text-zinc-300" />
          <span>Loading Operator Workspace Environment...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-none space-y-4">
        {pageHeader}
        <div className="mx-auto max-w-xl rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-sm text-rose-200">
          <h2 className="font-semibold">Workspace data could not be loaded</h2>
          <p className="mt-2 text-xs text-rose-300">{loadError}</p>
        </div>
      </div>
    );
  }

  if (identity?.role === "operator" && !activeLead && !postCallSummary) {
    return (
      <div className="mx-auto max-w-none space-y-4">
        {pageHeader}
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h2 className="text-base font-semibold text-zinc-100">Operator Console waiting for assignment</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            No callable contact is currently assigned. The routing service will place one here when an available lead is ready; Operators never browse or choose from the lead directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-none space-y-4" data-testid="operator-console" data-state={operatorConsoleState}>
      {pageHeader}
      
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

      {/* Operator Console hierarchy: P0/P1 lead action first, P2 script second, P3 support in the right rail. */}
      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 min-w-0 flex-col gap-4" aria-label="Primary operator work area" data-testid="operator-primary-work-area">
          <OperatorLeadHeader
            activeLead={activeLead}
            isCallActive={isCallActive}
            isDialing={isDialing}
            isMuted={softphoneSession.isMuted}
            durationSeconds={softphoneSession.durationSeconds}
            isStarting={isCallStartPending || isEndCallPending}
            isAwaitingOutcome={isAwaitingOutcome}
            recoveryRequired={recoveryRequired}
            isCompletionPending={isCompletionPending}
            onToggleCall={handleToggleCall}
            onToggleMute={() => softphoneController.toggleMute()}
            onCallOutcome={identity?.role === "operator" ? handleCallOutcome : undefined}
            onScheduleCallback={identity?.role === "operator" ? () => {
              setCallbackScheduleError(null);
              setIsCallbackScheduleOpen(true);
            } : undefined}
            onCreateOrder={identity?.role === "operator" ? undefined : () => {
              if (isCallActive || isDialing) {
                setNotificationToast("Finish the active call before opening order creation.");
                return;
              }
              if (!activeLead) return;
              setNotificationToast(null);
              router.push(`/orders/new?leadId=${encodeURIComponent(activeLead.id)}&origin=workspace`);
            }}
            onSimulateIncoming={handleSimulateIncoming}
            showIncomingSimulator={identity?.role !== "operator"}
          />

          <div className="min-h-[34rem] min-w-0 flex-1">
            <ProductScriptPanel
              isCallActive={isCallActive}
              product={products[0]}
            />
          </div>
        </section>

        <aside className="min-w-0 space-y-4 border-zinc-800/70 xl:border-l xl:pl-4" aria-label="Supporting customer context" data-testid="supporting-context-rail">
          <div className="flex items-start justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Supporting context</p>
              <p className="mt-1 text-[11px] text-zinc-600">History, notes and discovery prompts</p>
            </div>
            <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[9px] font-mono text-zinc-600">P2 / P3</span>
          </div>
          <section className="rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3 shadow-sm">
            {activeLead ? (
              <CustomerTimelineCard leadId={activeLead.id} refreshToken={activityRefreshToken} includeNotes={false} />
            ) : (
              <p className="text-sm text-zinc-400">No active customer selected.</p>
            )}
          </section>
          {activeLead && (
            <LeadNotesCard
              leadId={activeLead.id}
              notes={leadNotes}
              onNotesChange={(notes) => {
                setLeadNotes(notes);
                setActivityRefreshToken((current) => current + 1);
              }}
            />
          )}
          <AdditionalQuestionsCard questions={getProductScript(products[0]).discoveryQuestions} />
        </aside>
      </div>

        {orderFlowMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-dialog-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl">
            <ProductOrderPanel
                products={products}
                activeLead={activeLead}
                leadNotes={leadNotes}
                orderMode={orderFlowMode}
                onClose={() => setOrderFlowMode(null)}
                onOrderPlaced={handleOrderPlaced}
            />
          </div>
        </div>
      )}

      {/* Incoming Call Simulation Modal */}
      <IncomingCallModal
        lead={activeLead}
        isOpen={isIncomingCallOpen}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      <CallbackScheduleModal
        key={isCallbackScheduleOpen ? "callback-open" : "callback-closed"}
        isOpen={isCallbackScheduleOpen}
        leadName={activeLead?.full_name}
        isSubmitting={isCallbackSchedulePending}
        errorMessage={callbackScheduleError}
        onClose={() => {
          if (!isCallbackSchedulePending) setIsCallbackScheduleOpen(false);
        }}
        onSchedule={handleScheduleCallback}
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
