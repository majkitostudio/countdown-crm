"use client";

<<<<<<< HEAD
import React, { useState, useEffect, useCallback, Suspense } from "react";
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
import { IncomingCallModal } from "@/components/workspace/IncomingCallModal";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { CallbackScheduleModal } from "@/components/workspace/CallbackScheduleModal";
import type { CompletionOutcome } from "@/lib/dal/callCompletion";
import type { LeadQueueSnapshot } from "@/lib/dal/leadQueue";
import { getFailReasonLabel, type FailReason } from "@/lib/postCall";
import { createPostCallRetry } from "@/lib/postCallCompletion";
import { sounds } from "@/lib/audio";
import { ExecutionLogEntry, WorkflowDispatchResult } from "@/lib/workflows/types";
import { softphoneController, type CallSession } from "@/lib/telephony/softphone";
import { getActiveTelephonyAdapterClient } from "@/lib/telephony/telephonyAdapterClient";
import type { TelephonyAdapter } from "@/lib/telephony/telephonyAdapterShared";
import { OperationTimeoutError, withTimeout } from "@/lib/withTimeout";
import { completeCallAction } from "@/app/actions/crm";
import { listScheduledCallbacksAction } from "@/app/actions/calendar";
import { listLeadNotesAction } from "@/app/actions/leadNotes";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";
import { getConversationBriefAction } from "@/app/actions/conversationBrief";
import type { ConversationBriefDTO } from "@/lib/dal/conversationBrief";
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
import { Button } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getOperatorKeyboardAction } from "@/components/workspace/operatorKeyboardShortcuts";
import { ClientProfileCard } from "@/components/workspace/ClientProfileCard";
import { RecentContextRow } from "@/components/workspace/RecentContextRow";
import { ConversationBriefCard } from "@/components/workspace/ConversationBriefCard";
import {
  OperatorNextActionPanel,
} from "@/components/workspace/OperatorNextActionPanel";
import type {
  OperatorCallbackSignal,
  OperatorNextActionState,
} from "@/components/workspace/operatorNextAction";
import type { ClientProfileDensity } from "@/components/workspace/clientProfileDensity";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface PostCallSummary {
  leadName: string;
  outcomeLabel: string;
  durationSeconds: number;
  orderStatus: "created" | "not_created";
  transcriptStatus: "unavailable";
  orderId?: string;
  failReasonLabel?: string;
  operatorNote?: string;
  workflowEntries: ExecutionLogEntry[];
  workflowDispatches: WorkflowDispatchResult[];
}

interface WorkspaceCompletionRetryPayload {
  callSessionId: string;
  queueItemId: string | null;
  durationSeconds: number;
  outcome: CompletionOutcome;
  outcomeLabel: string;
  orderStatus: PostCallSummary["orderStatus"];
  orderValue: number;
  orderProductId?: string;
  callbackScheduledAt?: string;
  orderItems?: import("@/lib/callOrder").CallOrderItemInput[];
  operatorNote?: string;
  failReason?: FailReason;
}

type CompletionExecutor = (payload: WorkspaceCompletionRetryPayload) => Promise<{ callId: string; orderId?: string } | null>;

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
  const [completionSaveState, setCompletionSaveState] = useState<"saving" | "saved" | "failed">("saved");
  const [leadNotes, setLeadNotes] = useState<LeadNoteDTO[]>([]);
  const [conversationBrief, setConversationBrief] = useState<ConversationBriefDTO | null>(null);
  const [isConversationBriefLoading, setIsConversationBriefLoading] = useState(false);
  const [conversationBriefError, setConversationBriefError] = useState<string | null>(null);
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [isCallbackScheduleOpen, setIsCallbackScheduleOpen] = useState(false);
  const [isCallbackSchedulePending, setIsCallbackSchedulePending] = useState(false);
  const [callbackScheduleError, setCallbackScheduleError] = useState<string | null>(null);
  const [scheduledCallbacks, setScheduledCallbacks] = useState<OperatorCallbackSignal[]>([]);
  const [isCallbacksLoading, setIsCallbacksLoading] = useState(false);
  const [callbackInboxError, setCallbackInboxError] = useState<string | null>(null);
  const [isAssignmentRefreshing, setIsAssignmentRefreshing] = useState(false);
  const [isCallStartPending, setIsCallStartPending] = useState(false);
  const [isEndCallPending, setIsEndCallPending] = useState(false);
  const [isCompletionPending, setIsCompletionPending] = useState(false);
  const [softphoneSession, setSoftphoneSession] = useState<CallSession>(() => softphoneController.getSession());
  const [telephonyAdapter, setTelephonyAdapter] = useState<TelephonyAdapter>("simulation");
  const [isProfilePreferenceSaving, setIsProfilePreferenceSaving] = useState(false);
  const stopAudioRef = React.useRef<(() => void) | null>(null);
  const callStartPendingRef = React.useRef(false);
  const callStartRecoveryRef = React.useRef(false);
  const completionInFlightRef = React.useRef(false);
  const retryCompletionRef = React.useRef<(() => void) | null>(null);
  const completionExecutorRef = React.useRef<CompletionExecutor | null>(null);
  const activeQueueItemIdRef = React.useRef<string | null>(null);
  const identityRoleRef = React.useRef<string | null>(null);
  const { identity, isLoading: isIdentityLoading } = useOperatorIdentity();
  const {
    preferences: userPreferences,
    error: userPreferencesError,
    save: saveUserPreferences,
  } = useUserPreferences();
  const activeLeadId = activeLead?.id;

  const isDialing = softphoneSession.state === "dialing" || softphoneSession.state === "ringing";
  const isCallActive = softphoneSession.state === "connected" || softphoneSession.state === "on_hold";
  const isAwaitingOutcome = assignmentState === "awaiting_outcome";
  const callStartedAt = isCallActive && softphoneSession.startTime
    ? softphoneSession.startTime.toISOString()
    : null;

  const refreshCallbackInbox = useCallback(async () => {
    if (identity?.role !== "operator") return;

    setIsCallbacksLoading(true);
    setCallbackInboxError(null);
    try {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const callbacks = await listScheduledCallbacksAction(from, to);
      setScheduledCallbacks(callbacks.map((callback) => ({
        id: callback.id,
        leadName: callback.lead.full_name,
        scheduledAt: callback.scheduled_at,
      })));
    } catch (error) {
      setScheduledCallbacks([]);
      setCallbackInboxError(error instanceof Error ? error.message : "Callback inbox could not be loaded.");
    } finally {
      setIsCallbacksLoading(false);
    }
  }, [identity?.role]);

  const refreshOperatorAssignment = useCallback(async () => {
    if (identity?.role !== "operator") return;

    setIsAssignmentRefreshing(true);
    try {
      await setOperatorPresenceAction("available");
      const assignment = await claimNextLeadAction();
      setLeads(assignment ? [assignment.lead] : []);
      setActiveLead(assignment?.lead || null);
      setActiveQueueItemId(assignment?.queue_item_id || null);
      setAssignmentState(assignment?.assignment_state || null);
      setRecoveryRequired(assignment?.recovery_required || false);
      setCallDurationSeconds(
        assignment?.call_started_at
          ? Math.max(0, Math.round((Date.parse(assignment.call_ended_at || new Date().toISOString()) - Date.parse(assignment.call_started_at)) / 1000))
          : 0,
      );
      setNotificationToast(null);
      await refreshCallbackInbox();
    } catch (error) {
      setNotificationToast(error instanceof Error ? error.message : "The operator assignment could not be refreshed.");
    } finally {
      setIsAssignmentRefreshing(false);
    }
  }, [identity?.role, refreshCallbackInbox]);

  useEffect(() => {
    activeQueueItemIdRef.current = activeQueueItemId;
    identityRoleRef.current = identity?.role || null;
  }, [activeQueueItemId, identity?.role]);

  useEffect(() => softphoneController.subscribeState(setSoftphoneSession), []);

  useEffect(() => {
    if (isIdentityLoading || !identity) return;
    let isCurrent = true;
    void getActiveTelephonyAdapterClient()
      .then((adapter) => {
        if (isCurrent) setTelephonyAdapter(adapter);
      })
      .catch(() => {
        if (isCurrent) setTelephonyAdapter("simulation");
      });
    return () => {
      isCurrent = false;
    };
  }, [identity, isIdentityLoading]);

  useEffect(() => {
    if (isIdentityLoading || identity?.role !== "operator") return;
    const refreshTimer = window.setTimeout(() => {
      void refreshCallbackInbox();
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [activityRefreshToken, identity?.role, isIdentityLoading, refreshCallbackInbox]);

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
    let cancelled = false;

    async function loadConversationBrief() {
      if (identity?.role !== "operator" || !activeLeadId) {
        setConversationBrief(null);
        setConversationBriefError(null);
        setIsConversationBriefLoading(false);
        return;
      }

      setIsConversationBriefLoading(true);
      setConversationBriefError(null);
      try {
        const brief = await getConversationBriefAction(activeLeadId);
        if (!cancelled) setConversationBrief(brief);
      } catch (error) {
        if (!cancelled) {
          setConversationBrief(null);
          setConversationBriefError(error instanceof Error ? error.message : "Conversation Brief could not be loaded.");
        }
      } finally {
        if (!cancelled) setIsConversationBriefLoading(false);
      }
    }

    void loadConversationBrief();
    return () => {
      cancelled = true;
    };
  }, [activeLeadId, activityRefreshToken, assignmentState, identity?.role, recoveryRequired]);

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

  const completeCall = useCallback(async (
    outcome: CompletionOutcome,
    outcomeLabel: string,
    orderStatus: PostCallSummary["orderStatus"],
    orderValue = 0,
    orderProductId?: string,
    callbackScheduledAt?: string,
    orderItems?: import("@/lib/callOrder").CallOrderItemInput[],
    operatorNote?: string,
    failReason?: FailReason,
    callSessionId = softphoneSession.id,
    queueItemId = activeQueueItemId,
    preservedDurationSeconds?: number,
  ): Promise<{ callId: string; orderId?: string } | null> => {
    if (!activeLead || completionInFlightRef.current) return null;

    completionInFlightRef.current = true;
    setIsCompletionPending(true);
    setCompletionSaveState("saving");
    const durationSeconds = preservedDurationSeconds ?? (callDurationSeconds || (callStartedAt
      ? Math.max(0, Math.round((Date.parse(new Date().toISOString()) - Date.parse(callStartedAt)) / 1000))
      : softphoneSession.durationSeconds));
    try {
      if (identity?.role === "operator") {
        if (!queueItemId) {
          throw new Error("No active server assignment is available for call completion");
        }

        const queueOutcome = outcome === "objection_handled" ? "objection" : outcome;
        const completion = await completeLeadCallAction({
          queue_item_id: queueItemId,
          call_session_id: callSessionId,
          duration_seconds: durationSeconds,
          outcome: queueOutcome,
          ai_sentiment: orderStatus === "created" ? "Positive" : "Neutral",
          order_items: orderItems || null,
          order_product_id: orderProductId || null,
          order_total_amount: orderProductId ? orderValue : null,
          transcript: null,
          callback_scheduled_at: queueOutcome === "followup_scheduled" ? callbackScheduledAt || null : null,
          operator_note: operatorNote?.trim() || null,
          fail_reason: failReason || null,
        });

        const nextAssignment = completion.next_lead;
        softphoneController.hangup();
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
          failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
          operatorNote: operatorNote?.trim() || undefined,
          workflowEntries,
          workflowDispatches: completion.workflowDispatches,
        });
        setCompletionSaveState("saved");
        retryCompletionRef.current = null;
        setActivityRefreshToken((current) => current + 1);
        return { callId: completion.call_id, orderId: completion.order_id || undefined };
      }

      const completion = await completeCallAction({
        lead_id: activeLead.id,
        call_session_id: callSessionId,
        duration_seconds: durationSeconds,
        outcome,
        ai_sentiment: orderStatus === "created" ? "Positive" : "Neutral",
        order_items: orderItems || null,
        order_product_id: orderProductId,
        order_total_amount: orderProductId ? orderValue : null,
        transcript: null,
        operator_note: operatorNote?.trim() || null,
        fail_reason: failReason || null,
        callback_scheduled_at: outcome === "followup_scheduled" ? callbackScheduledAt || null : null,
      });

      softphoneController.hangup();
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
        failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
        operatorNote: operatorNote?.trim() || undefined,
        workflowEntries,
        workflowDispatches: completion.workflowDispatches,
      });
      setCompletionSaveState("saved");
      retryCompletionRef.current = null;
      setActivityRefreshToken((current) => current + 1);
      return { callId: completion.call_id, orderId: completion.order_id || undefined };
    } catch (error) {
      setCompletionSaveState("failed");
      retryCompletionRef.current = createPostCallRetry(
        (payload) => completionExecutorRef.current?.(payload) || Promise.resolve(null),
        {
          callSessionId,
          queueItemId,
          durationSeconds,
          outcome,
          outcomeLabel,
          orderStatus,
          orderValue,
          orderProductId,
          callbackScheduledAt,
          orderItems,
          operatorNote,
          failReason,
        },
      );
      setPostCallSummary({
        leadName: activeLead.full_name,
        outcomeLabel,
        durationSeconds,
        orderStatus,
        transcriptStatus: "unavailable",
        failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
        operatorNote: operatorNote?.trim() || undefined,
        workflowEntries: [],
        workflowDispatches: [],
      });
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
  }, [activeLead, activeQueueItemId, callDurationSeconds, callStartedAt, identity, softphoneSession.durationSeconds, softphoneSession.id]);

  useEffect(() => {
    completionExecutorRef.current = (payload) => completeCall(
      payload.outcome,
      payload.outcomeLabel,
      payload.orderStatus,
      payload.orderValue,
      payload.orderProductId,
      payload.callbackScheduledAt,
      payload.orderItems,
      payload.operatorNote,
      payload.failReason,
      payload.callSessionId,
      payload.queueItemId,
      payload.durationSeconds,
    );
    return () => {
      completionExecutorRef.current = null;
    };
  }, [completeCall]);

  // Outbound call toggle flow (Dialing -> Audio Ringtone -> Connected)
  const handleToggleCall = useCallback(() => {
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
                { queueItemId: activeQueueItemId, productId: products[0]?.id || null },
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

      void softphoneController.dial(activeLead.id, activeLead.phone, activeLead.full_name, {
        productId: products[0]?.id || null,
      })
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
  }, [activeLead, activeQueueItemId, assignmentState, identity, isAwaitingOutcome, isCallActive, isDialing, isEndCallPending, products, softphoneSession.durationSeconds]);

  // Simulate Incoming Call Trigger
  const handleSimulateIncoming = () => {
    if (leads.length > 1) {
      const targetLead = leads[1] || leads[0];
      setActiveLead(targetLead);
    }
    setIsIncomingCallOpen(true);
    const stopRingtone = sounds.playRingtone(userPreferences.ringtone_volume);
    stopAudioRef.current = stopRingtone;
  };

  const handleProfileDensityChange = useCallback(async (density: ClientProfileDensity) => {
    setIsProfilePreferenceSaving(true);
    try {
      await saveUserPreferences({ ...userPreferences, client_profile_density: density });
    } catch {
      // The shared preference hook exposes the save error beside the control.
    } finally {
      setIsProfilePreferenceSaving(false);
    }
  }, [saveUserPreferences, userPreferences]);

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

  const advanceToNextLead = useCallback(() => {
    if (!activeLead || leads.length === 0) return;
    const currentIndex = leads.findIndex((l) => l.id === activeLead.id);
    const nextIndex = (currentIndex + 1) % leads.length;
    setActiveLead(leads[nextIndex]);
  }, [activeLead, leads]);

  const handleCallOutcome = useCallback((outcome: CallOutcome, failDetails?: { failReason: FailReason; note: string }) => {
    if (!isAwaitingOutcome || completionInFlightRef.current) return;

    if (outcome === "order") {
      if (!activeLead || !activeQueueItemId) {
        setNotificationToast("Order creation is unavailable because the active assignment could not be verified.");
        return;
      }
      setNotificationToast(null);
      router.push(`/orders/new?leadId=${encodeURIComponent(activeLead.id)}&origin=workspace&mode=call&callSessionId=${encodeURIComponent(softphoneSession.id)}`);
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
      fail: ["objection_handled", "Fail"],
    };
    const [callOutcome, outcomeLabel] = outcomeConfig[outcome];
    void completeCall(callOutcome, outcomeLabel, "not_created", 0, undefined, undefined, undefined, failDetails?.note, failDetails?.failReason);
  }, [activeLead, activeQueueItemId, completeCall, isAwaitingOutcome, router, softphoneSession.id]);

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

  const handleNextLead = useCallback(() => {
    setPostCallSummary(null);
    setNotificationToast(null);
    if (identity?.role !== "operator") {
      advanceToNextLead();
    }
  }, [advanceToNextLead, identity?.role]);

  useEffect(() => {
    if (identity?.role !== "operator") return;

    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (isIncomingCallOpen || isCallbackScheduleOpen) return;

      const action = getOperatorKeyboardAction(event);
      if (!action) return;

      event.preventDefault();

      switch (action) {
        case "toggle_call":
          handleToggleCall();
          return;
        case "toggle_mute":
          if (isCallActive) softphoneController.toggleMute();
          return;
        case "call_later":
          handleCallOutcome("call_later");
          return;
        case "schedule_callback":
          handleCallOutcome("schedule");
          return;
        case "fail":
          document.getElementById("call-outcome-fail")?.click();
          return;
        case "create_order":
          handleCallOutcome("order");
          return;
        case "focus_note": {
          const noteInput = document.getElementById("lead-note-input");
          if (noteInput instanceof HTMLTextAreaElement) {
            noteInput.focus();
            noteInput.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [identity?.role, isIncomingCallOpen, isCallbackScheduleOpen, isCallActive, handleToggleCall, handleCallOutcome]);

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

  const operatorActionState: OperatorNextActionState = operatorConsoleState === "loading" || operatorConsoleState === "load_error"
    ? "waiting_assignment"
    : operatorConsoleState;

  const handleNextAction = useCallback(() => {
    if (operatorConsoleState === "waiting_assignment") {
      void refreshOperatorAssignment();
      return;
    }

    if (operatorConsoleState === "awaiting_outcome" || operatorConsoleState === "callback_modal") {
      document.getElementById("call-outcome-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (operatorConsoleState === "post_call_summary") {
      handleNextLead();
      return;
    }

    handleToggleCall();
  }, [handleNextLead, handleToggleCall, operatorConsoleState, refreshOperatorAssignment]);

  const operatorNextActionPanel = identity?.role === "operator" ? (
    <OperatorNextActionPanel
      state={operatorActionState}
      leadName={activeLead?.full_name || null}
      callbacks={scheduledCallbacks}
      isCallbacksLoading={isCallbacksLoading}
      callbackError={callbackInboxError}
      isAssignmentRefreshing={isAssignmentRefreshing}
      onPrimaryAction={handleNextAction}
      onRefreshCallbacks={() => void refreshCallbackInbox()}
    />
  ) : null;

  const pageHeader = (
    <PageHeader
      icon={PhoneCall}
      title="Operator Console"
      description="Handle the assigned customer with the brief, approved script, and outcome in one place."
      badge={pageHeaderBadge}
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
        <StatusAlert tone="danger" className="w-full">
          <div className="mx-auto max-w-xl text-sm text-rose-200">
            <h2 className="font-semibold">Workspace data could not be loaded</h2>
            <p className="mt-2 text-xs text-rose-300">{loadError}</p>
          </div>
        </StatusAlert>
      </div>
    );
  }

  if (identity?.role === "operator" && !activeLead && !postCallSummary) {
    return (
      <div className="mx-auto max-w-none space-y-4">
        {pageHeader}
        {operatorNextActionPanel}
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-none space-y-4 px-3 sm:px-4" data-testid="operator-console" data-state={operatorConsoleState}>
      {pageHeader}
      {operatorNextActionPanel}
      
      {/* Toast Notification Banner */}
      {notificationToast && (
        <StatusAlert tone="neutral" className="w-full" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-100">
          <span>{notificationToast}</span>
          <Button variant="quiet" onClick={() => setNotificationToast(null)} aria-label="Dismiss notification">✕</Button>
          </div>
        </StatusAlert>
      )}

      {/* Post-Call Summary */}
      {postCallSummary && (
        <PostCallSummaryCard
          summary={postCallSummary}
          onDismiss={() => setPostCallSummary(null)}
          onNextLead={handleNextLead}
          saveState={completionSaveState}
          onRetry={() => retryCompletionRef.current?.()}
        />
      )}

      {/* Operator Console hierarchy: P0/P1 lead action first, P2 script second, P3 support in the right rail. */}
      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 min-w-0 flex-col gap-4" aria-label="Primary operator work area" data-testid="operator-primary-work-area">
          {identity?.role === "operator" && activeLead && (
            <ConversationBriefCard
              brief={conversationBrief}
              isLoading={isConversationBriefLoading || (!conversationBrief && !conversationBriefError)}
              error={conversationBriefError}
            />
          )}

          <OperatorLeadHeader
            activeLead={activeLead}
            isCallActive={isCallActive}
            isDialing={isDialing}
            isMuted={softphoneSession.isMuted}
            durationSeconds={softphoneSession.durationSeconds}
            callFailureMessage={softphoneSession.errorMessage}
            isStarting={isCallStartPending || isEndCallPending}
            telephonyAdapter={telephonyAdapter}
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

          {activeLead && (
            <ClientProfileCard
              lead={activeLead}
              density={userPreferences.client_profile_density}
              isPreferenceSaving={isProfilePreferenceSaving}
              preferenceError={userPreferencesError}
              onDensityChange={(density) => void handleProfileDensityChange(density)}
            />
          )}

          <div className="min-h-[34rem] min-w-0 flex-1">
            <ProductScriptPanel
              isCallActive={isCallActive}
              product={products[0]}
              activeSnapshot={softphoneSession.scriptSnapshot}
            />
          </div>
        </section>

        <aside className="min-w-0 space-y-4 border-zinc-800/70 xl:border-l xl:pl-4" aria-label="Supporting customer context" data-testid="supporting-context-rail">
          <div className="flex items-start justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Customer history</p>
              <p className="mt-1 text-[11px] text-zinc-500">Timeline, notes and questions — glance only, nothing here blocks your call</p>
            </div>
            <StatusBadge tone="neutral">History</StatusBadge>
          </div>
          {activeLead && <RecentContextRow leadId={activeLead.id} refreshToken={activityRefreshToken} />}
          <Surface variant="inset" className="w-full">
            <section className="p-3">
            {activeLead ? (
              <CustomerTimelineCard leadId={activeLead.id} refreshToken={activityRefreshToken} includeNotes={false} />
            ) : (
              <p className="text-sm text-zinc-400">No active customer selected.</p>
            )}
            </section>
          </Surface>
          {activeLead && (
            <LeadNotesCard
              key={activeLead.id}
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

      {/* Incoming Call Simulation Modal */}
      <IncomingCallModal
        lead={activeLead}
        isOpen={isIncomingCallOpen}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      <CallbackScheduleModal
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

=======
import { useState } from "react";
import { Bell, CalendarClock, Check, ChevronDown, Clock3, FileText, Headphones, Mail, Mic, MoreHorizontal, Phone, PhoneCall, PhoneOff, Search, ShieldCheck, Sparkles, StickyNote, Tag, UserRound, Users, Volume2 } from "lucide-react";

type ConsoleState = "waiting" | "ready" | "dialing" | "active" | "outcome" | "callback" | "summary" | "recovery" | "error";
const labels: Record<ConsoleState, string> = { waiting: "Waiting for assignment", ready: "Ready to call", dialing: "Dialing", active: "Live call", outcome: "Outcome required", callback: "Schedule callback", summary: "Post-call wrap-up", recovery: "Recovery required", error: "Queue unavailable" };
const customer = { name: "Maya Chen", initials: "MC", company: "Northstar Studio", phone: "+1 (415) 555-0182", email: "maya@northstar.studio", source: "Website demo request", id: "LD-28491" };
const timeline = [{ time: "Today, 09:42", title: "Lead assigned", detail: "Routing rule: New business · West Coast", icon: Users }, { time: "Yesterday, 16:18", title: "Demo request submitted", detail: "Interested in team workspace and analytics", icon: FileText }, { time: "Mon, 11:05", title: "Email opened", detail: "Welcome to Countdown CRM", icon: Mail }];
const script = [{ label: "Opening", text: "Hi Maya, this is Alex from Countdown. You requested a walkthrough of the workspace for Northstar Studio. Is now still a good time for a quick conversation?" }, { label: "Discovery", text: "What does your team use today to keep track of follow-ups after a call?" }, { label: "Positioning", text: "Countdown gives operators one focused place to call, capture context, and finish the next action without losing momentum." }];
function Pill({ state }: { state: ConsoleState }) { const hot = state === "active" || state === "dialing"; const attention = state === "recovery" || state === "outcome"; return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${attention ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : hot ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : state === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-zinc-700 bg-zinc-900 text-zinc-300"}`}><span className={`size-1.5 rounded-full ${hot ? "animate-pulse bg-rose-400" : attention ? "bg-amber-300" : state === "error" ? "bg-red-300" : "bg-emerald-300"}`} />{labels[state]}</span>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border-l border-zinc-800 pl-4"><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-1 font-mono text-sm text-zinc-100">{value}</p><p className="mt-0.5 text-[11px] text-zinc-500">{detail}</p></div>; }
>>>>>>> origin/main
export default function WorkspacePage() {
 const [state, setState] = useState<ConsoleState>("ready"); const [dock, setDock] = useState<"context" | "notes" | "history">("context"); const [muted, setMuted] = useState(false); const [note, setNote] = useState(""); const [saved, setSaved] = useState(false); const [showStates, setShowStates] = useState(false); const isCall = state === "active" || state === "dialing";
 const primary = () => { if (state === "waiting" || state === "error") setState("ready"); else if (state === "ready") setState("dialing"); else if (state === "dialing") setState("active"); else if (state === "active") setState("outcome"); else if (state === "outcome" || state === "recovery") setState("summary"); else setState("ready"); };
 const copy = { waiting: "The queue is clear. Your next assigned lead will appear here.", ready: "Review the call brief, then start when you are ready.", dialing: "Connecting to Maya Chen. Keep this workspace open.", active: "Use the brief and approved script while you listen.", outcome: "This call stays assigned until an outcome is saved.", callback: "Choose a time that works for the customer and save it.", summary: "Review what happened and confirm the next action.", recovery: "The previous call ended unexpectedly. Complete recovery before taking another lead.", error: "We could not reach the assignment service. Your workspace is safe." }[state];
 return <main className="min-h-screen bg-[#101113] text-zinc-100"><header className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-[#151618] px-5 lg:px-8"><div className="flex items-center gap-5"><div><p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Operator workspace</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight">Call floor <span className="font-normal text-zinc-500">/ West team</span></h1></div><div className="hidden h-7 w-px bg-zinc-800 md:block" /><div className="hidden items-center gap-2 text-xs text-zinc-400 md:flex"><span className="size-2 rounded-full bg-emerald-400" />Connected <span className="font-mono text-zinc-600">SIM-01</span></div></div><div className="flex items-center gap-3"><button className="hidden items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 md:flex"><Search />Search workspace <kbd className="ml-2 rounded border border-zinc-700 px-1.5 font-mono text-[10px]">⌘K</kbd></button><button aria-label="Notifications" className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Bell /></button><div className="flex items-center gap-2 border-l border-zinc-800 pl-3"><div className="flex size-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold">AL</div><div className="hidden sm:block"><p className="text-xs font-medium">Alex Lee</p><p className="text-[10px] text-zinc-500">Operator</p></div><ChevronDown className="hidden text-zinc-500 sm:block" /></div></div></header>
 <div className="border-b border-zinc-800/80 bg-[#131416] px-5 py-3 lg:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div className="flex items-center gap-3"><Pill state={state} /><p className="hidden text-xs text-zinc-500 md:block">{copy}</p></div><button onClick={() => setShowStates(!showStates)} className="text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-zinc-300">Preview states</button></div></div>
 {showStates && <div className="border-b border-zinc-800 bg-zinc-950 px-5 py-2 lg:px-8"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2"><span className="mr-2 text-[10px] uppercase tracking-wider text-zinc-600">Mockup state</span>{(Object.keys(labels) as ConsoleState[]).map((key) => <button key={key} onClick={() => setState(key)} className={`rounded-md px-2.5 py-1.5 text-[10px] ${state === key ? "bg-zinc-100 text-zinc-950" : "bg-zinc-900 text-zinc-500 hover:text-zinc-200"}`}>{labels[key]}</button>)}</div></div>}
 <div className="mx-auto grid max-w-[1500px] xl:grid-cols-[minmax(0,1fr)_360px]"><section className="min-w-0 border-r border-zinc-800/80"><div className="border-b border-zinc-800/80 px-5 py-5 lg:px-8"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="flex size-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-sm font-semibold">{customer.initials}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold tracking-tight">{customer.name}</h2><span className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">New lead</span></div><p className="mt-1 text-sm text-zinc-400">{customer.company} <span className="mx-1.5 text-zinc-700">·</span> {customer.source}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5"><Phone />{customer.phone}</span><span className="inline-flex items-center gap-1.5"><Mail />{customer.email}</span></div></div></div><button className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="More lead actions"><MoreHorizontal /></button></div></div>
 <div className="border-b border-zinc-800/80 bg-[#151618] px-5 py-4 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className={`flex size-10 items-center justify-center rounded-lg ${isCall ? "bg-rose-500/15 text-rose-300" : "bg-zinc-800 text-zinc-400"}`}>{state === "dialing" ? <Volume2 /> : isCall ? <PhoneCall /> : <Phone />}</div><div><p className="text-sm font-medium">{state === "active" ? "Call in progress" : state === "dialing" ? "Connecting to customer" : state === "outcome" ? "Call ended · outcome required" : "Primary call action"}</p><p className="mt-0.5 text-xs text-zinc-500">{isCall ? "Simulated line" : "No active line"} <span className="mx-1.5 text-zinc-700">·</span> {isCall ? "00:42" : "Ready"}</p></div></div><div className="flex items-center gap-2"><button onClick={() => setMuted(!muted)} disabled={!isCall} className={`rounded-md border px-3 py-2 text-xs ${muted ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}><Mic />{muted ? "Muted" : "Mute"}</button><button onClick={primary} disabled={state === "dialing"} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold ${isCall ? "bg-rose-500 text-white hover:bg-rose-400" : state === "outcome" || state === "recovery" ? "bg-amber-300 text-amber-950 hover:bg-amber-200" : "bg-zinc-100 text-zinc-950 hover:bg-white"}`}>{isCall ? <PhoneOff /> : <PhoneCall />}{isCall ? "End call" : state === "outcome" ? "Choose outcome" : state === "recovery" ? "Recover call" : state === "ready" ? "Start call" : "Continue"}</button></div></div></div>
 <div className="grid gap-8 px-5 py-6 lg:px-8 lg:py-8 2xl:grid-cols-[minmax(0,1fr)_280px]"><div><div className="mb-5 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Conversation guide</p><h3 className="mt-1 text-base font-semibold">Approved call script</h3></div><div className="flex items-center gap-2 text-[10px] text-zinc-500"><ShieldCheck />Version 4 · approved</div></div><div className="border-l-2 border-zinc-700 pl-5"><div className="flex flex-col gap-7">{script.map((item, i) => <div key={item.label}><div className="mb-2 flex items-center gap-2"><span className="font-mono text-[10px] text-zinc-600">0{i + 1}</span><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{item.label}</p></div><p className="max-w-2xl text-[15px] leading-7 text-zinc-200">{item.text}</p></div>)}</div></div><div className="mt-8 flex items-center gap-3 border-t border-zinc-800 pt-4 text-xs text-zinc-500"><Sparkles />Suggested focus: confirm team size and follow-up ownership.</div></div><aside className="flex flex-col gap-5"><div><div className="mb-3 flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Call brief</h3><MoreHorizontal className="text-zinc-600" /></div><div className="flex flex-col gap-3"><div><p className="text-[11px] text-zinc-500">Reason for contact</p><p className="mt-1 text-xs leading-5 text-zinc-200">Evaluating a shared workspace for a 12-person studio team.</p></div><div><p className="text-[11px] text-zinc-500">Likely priority</p><p className="mt-1 text-xs leading-5 text-zinc-200">Visibility after a call and consistent follow-up.</p></div><div><p className="text-[11px] text-zinc-500">Recommended tone</p><p className="mt-1 text-xs leading-5 text-zinc-200">Curious, concise, operational.</p></div></div></div><div className="border-t border-zinc-800 pt-5"><h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Discovery prompts</h3><div className="flex flex-col gap-2"><button className="flex items-center justify-between border-b border-zinc-800/70 py-2 text-left text-xs text-zinc-300">Current workflow <ChevronDown /></button><button className="flex items-center justify-between border-b border-zinc-800/70 py-2 text-left text-xs text-zinc-300">Decision process <ChevronDown /></button><button className="flex items-center justify-between border-b border-zinc-800/70 py-2 text-left text-xs text-zinc-300">Timing and next step <ChevronDown /></button></div></div></aside></div><div className="border-t border-zinc-800/80 px-5 py-4 lg:px-8"><div className="grid gap-4 sm:grid-cols-3"><Metric label="Lead ID" value={customer.id} detail="Assigned to you" /><Metric label="Last contact" value="Never" detail="First conversation" /><Metric label="Queue position" value="#03" detail="West team" /></div></div></section>
 <aside className="min-h-[500px] bg-[#131416]"><div className="flex border-b border-zinc-800/80 px-5 lg:px-6">{(["context", "notes", "history"] as const).map((key) => <button key={key} onClick={() => setDock(key)} className={`mr-5 border-b-2 px-1 py-4 text-xs font-medium ${dock === key ? "border-zinc-100 text-zinc-100" : "border-transparent text-zinc-500"}`}>{key[0].toUpperCase() + key.slice(1)}</button>)}</div><div className="flex flex-col gap-7 p-5 lg:p-6">{dock === "context" && <><div><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Customer profile</p><h3 className="mt-1 text-sm font-semibold">{customer.name}</h3></div><UserRound className="text-zinc-600" /></div><div className="flex flex-col gap-3 text-xs"><div className="flex justify-between"><span className="text-zinc-500">Company</span><span>{customer.company}</span></div><div className="flex justify-between"><span className="text-zinc-500">Email</span><span className="max-w-[180px] truncate">{customer.email}</span></div><div className="flex justify-between"><span className="text-zinc-500">Source</span><span>Website</span></div><div className="flex justify-between"><span className="text-zinc-500">Status</span><span className="text-emerald-300">New lead</span></div></div></div><div className="border-t border-zinc-800 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Recent activity</h3><Clock3 className="text-zinc-600" /></div><div className="flex flex-col gap-4">{timeline.map((item) => { const Icon = item.icon; return <div key={item.time} className="flex gap-3"><div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400"><Icon /></div><div><p className="text-xs">{item.title}</p><p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{item.detail}</p><p className="mt-1 font-mono text-[10px] text-zinc-600">{item.time}</p></div></div>; })}</div></div><div className="border-t border-zinc-800 pt-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><Tag />Tags</div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">New business</span><span className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400">Team plan</span></div></div></>}{dock === "notes" && <div><div className="mb-4 flex items-center gap-2"><StickyNote className="text-zinc-500" /><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Operator notes</p><h3 className="mt-1 text-sm font-semibold">Private to your team</h3></div></div><textarea value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} placeholder="Capture useful context for the next action…" rows={8} className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600" /><button onClick={() => setSaved(true)} className="mt-3 w-full rounded-md bg-zinc-100 py-2 text-xs font-semibold text-zinc-950 hover:bg-white">{saved ? "Saved" : "Save note"}</button>{saved && <p className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300"><Check />Note saved to this mockup.</p>}</div>}{dock === "history" && <div><div className="mb-4 flex items-center gap-2"><CalendarClock className="text-zinc-500" /><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Customer history</p><h3 className="mt-1 text-sm font-semibold">No prior orders</h3></div></div><p className="text-xs leading-5 text-zinc-500">This is the first recorded conversation for {customer.name}. Orders and previous call outcomes will appear here when available.</p><div className="mt-6 rounded-md border border-dashed border-zinc-800 p-5 text-center"><Headphones className="mx-auto text-zinc-700" /><p className="mt-2 text-xs text-zinc-500">No previous activity</p></div></div>}</div></aside></div></main>;
}
