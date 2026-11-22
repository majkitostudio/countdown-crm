"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneCall, RefreshCw, X } from "lucide-react";
import { Lead, getLeads } from "@/lib/leads";
import { Product, getProducts } from "@/lib/products";
import { getProductScript } from "@/lib/productScripts";
import type { CallOutcome } from "@/components/workspace/CallStatusBar";
import { CustomerTimelineCard } from "@/components/workspace/CustomerTimelineCard";
import { LeadNotesCard } from "@/components/workspace/LeadNotesCard";
import { OperatorLeadHeader } from "@/components/workspace/OperatorLeadHeader";
import { ProductScriptPanel } from "@/components/workspace/ProductScriptPanel";
import { IncomingCallModal } from "@/components/workspace/IncomingCallModal";
import { PostCallSummaryCard } from "@/components/workspace/PostCallSummaryCard";
import { ScheduleCallModal } from "@/components/workspace/ScheduleCallModal";
import { ObjectionDrawer } from "@/components/products/ObjectionDrawer";
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
import {
  createContinuousSpeechRecognition,
  isBrowserSpeechRecognitionSupported,
  type ContinuousSpeechRecognition,
} from "@/lib/speechRecognition";
import type { TranscriptEntry } from "@/lib/callTranscript";
import { completeCallAction } from "@/app/actions/crm";
import { requestAssistanceAction } from "@/app/actions/assistance";
import { listScheduledCallsAction } from "@/app/actions/calendar";
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
  setOperatorPresenceAction,
  startLeadCallAction,
} from "@/app/actions/leadQueue";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import { useCallSession } from "@/components/layout/CallSessionProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { getOperatorKeyboardAction } from "@/components/workspace/operatorKeyboardShortcuts";
import { RecentContextRow } from "@/components/workspace/RecentContextRow";
import { ConversationBriefCard } from "@/components/workspace/ConversationBriefCard";
import {
  OperatorNextActionPanel,
} from "@/components/workspace/OperatorNextActionPanel";
import type {
  OperatorScheduledCallSignal,
  OperatorNextActionState,
} from "@/components/workspace/operatorNextAction";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface PostCallSummary {
  leadName: string;
  outcomeLabel: string;
  durationSeconds: number;
  orderStatus: "created" | "not_created";
  transcriptStatus: "unavailable" | "captured";
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
  scheduledAt?: string;
  orderItems?: import("@/lib/callOrder").CallOrderItemInput[];
  operatorNote?: string;
  failReason?: FailReason;
  preservedTranscript?: string | null;
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
  | "schedule_modal"
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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [postCallSummary, setPostCallSummary] = useState<PostCallSummary | null>(null);
  const [completionSaveState, setCompletionSaveState] = useState<"saving" | "saved" | "failed">("saved");
  const [leadNotes, setLeadNotes] = useState<LeadNoteDTO[]>([]);
  const [conversationBrief, setConversationBrief] = useState<ConversationBriefDTO | null>(null);
  const [isConversationBriefLoading, setIsConversationBriefLoading] = useState(false);
  const [conversationBriefError, setConversationBriefError] = useState<string | null>(null);
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [assistancePending, setAssistancePending] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduleModalPending, setIsScheduleModalPending] = useState(false);
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<OperatorScheduledCallSignal[]>([]);
  const [isScheduledCallsLoading, setIsScheduledCallsLoading] = useState(false);
  const [scheduledCallInboxError, setScheduledCallInboxError] = useState<string | null>(null);
  const [isAssignmentRefreshing, setIsAssignmentRefreshing] = useState(false);
  const [isCallStartPending, setIsCallStartPending] = useState(false);
  const [isEndCallPending, setIsEndCallPending] = useState(false);
  const [isCompletionPending, setIsCompletionPending] = useState(false);
  const [callEndedInSession, setCallEndedInSession] = useState(false);
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);
  const [isObjectionCatalogOpen, setIsObjectionCatalogOpen] = useState(false);
  const [softphoneSession, setSoftphoneSession] = useState<CallSession>(() => softphoneController.getSession());
  const [telephonyAdapter, setTelephonyAdapter] = useState<TelephonyAdapter>("simulation");
  const stopAudioRef = React.useRef<(() => void) | null>(null);
  const callStartPendingRef = React.useRef(false);
  const callStartRecoveryRef = React.useRef(false);
  const completionInFlightRef = React.useRef(false);
  const retryCompletionRef = React.useRef<(() => void) | null>(null);
  const completionExecutorRef = React.useRef<CompletionExecutor | null>(null);
  const speechRecognitionRef = React.useRef<ContinuousSpeechRecognition | null>(null);
  const transcriptEntriesRef = React.useRef<TranscriptEntry[]>([]);
  const lastSessionIdRef = React.useRef<string | null>(null);
  const { identity, isLoading: isIdentityLoading } = useOperatorIdentity();
  const { setServerContext } = useCallSession();
  const {
    preferences: userPreferences,
  } = useUserPreferences();
  const activeLeadId = activeLead?.id;

  const isDialing = softphoneSession.state === "dialing" || softphoneSession.state === "ringing";
  const isCallActive = softphoneSession.state === "connected" || softphoneSession.state === "on_hold";
  const isAwaitingOutcome = assignmentState === "awaiting_outcome";
  const callStartedAt = isCallActive && softphoneSession.startTime
    ? softphoneSession.startTime.toISOString()
    : null;

  const refreshScheduledCallInbox = useCallback(async () => {
    if (identity?.role !== "operator") return;

    setIsScheduledCallsLoading(true);
    setScheduledCallInboxError(null);
    try {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const scheduledCalls = await listScheduledCallsAction(from, to);
      setScheduledCalls(scheduledCalls.map((scheduledCall) => ({
        id: scheduledCall.id,
        leadId: scheduledCall.lead_id,
        leadName: scheduledCall.lead.full_name,
        phone: scheduledCall.lead.phone,
        scheduledAt: scheduledCall.scheduled_at,
      })));
    } catch (error) {
      setScheduledCalls([]);
      setScheduledCallInboxError(error instanceof Error ? error.message : "Naplánované hovory se nepodařilo načíst.");
    } finally {
      setIsScheduledCallsLoading(false);
    }
  }, [identity?.role]);

  const requestAssistance = useCallback(async (requestType: "help" | "sos") => {
    if (!activeQueueItemId) {
      setNotificationToast("Žádost o pomoc vyžaduje aktivní přiřazení.");
      return;
    }
    setAssistancePending(true);
    try {
      await requestAssistanceAction({ queueItemId: activeQueueItemId, requestType });
      setNotificationToast(requestType === "sos" ? "SOS signál byl odeslán vedoucímu týmu." : "Žádost o pomoc byla odeslána vedoucímu týmu.");
    } catch (error) {
      setAssistancePending(false);
      setNotificationToast(error instanceof Error ? error.message : "Žádost o pomoc se nepodařilo odeslat.");
    }
  }, [activeQueueItemId]);

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
      setAssistancePending(false);
      await refreshScheduledCallInbox();
    } catch (error) {
      setNotificationToast(error instanceof Error ? error.message : "Přiřazení operátora se nepodařilo obnovit.");
    } finally {
      setIsAssignmentRefreshing(false);
    }
  }, [identity?.role, refreshScheduledCallInbox]);

  useEffect(() => softphoneController.subscribeState((session) => {
    setSoftphoneSession(session);
    if (session.state !== "dialing" && session.state !== "ringing" && stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
  }), []);

  useEffect(() => {
    if (softphoneSession.id && softphoneSession.id !== lastSessionIdRef.current) {
      lastSessionIdRef.current = softphoneSession.id;
      transcriptEntriesRef.current = [];
    }
  }, [softphoneSession.id]);

  // Silent background speech recognition during active call
  useEffect(() => {
    if (!isCallActive) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // silent fallback
        }
        speechRecognitionRef.current = null;
      }
      return;
    }

    if (!isBrowserSpeechRecognitionSupported()) return;

    if (!speechRecognitionRef.current) {
      try {
        const continuous = createContinuousSpeechRecognition({
          language: "cs-CZ",
          onStart: () => {},
          onInterimResult: () => {},
          onFinalResult: (transcript) => {
            if (softphoneSession.isMuted) return;
            const cleanText = transcript.trim();
            if (!cleanText) return;
            const startTime = softphoneSession.startTime ? softphoneSession.startTime.getTime() : Date.now();
            const elapsedSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
            const mins = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
            const secs = String(elapsedSec % 60).padStart(2, "0");
            transcriptEntriesRef.current.push({
              speaker: "operator",
              text: cleanText,
              timestamp: `${mins}:${secs}`,
            });
          },
          onError: (err) => {
            // Completely silent background operation per operator requirements
            console.debug("[SpeechRecognition] Silent notification:", err.error);
          },
          onEnd: () => {},
        });
        if (continuous) {
          continuous.start();
          speechRecognitionRef.current = continuous;
        }
      } catch (err) {
        console.debug("[SpeechRecognition] Silent init failure:", err);
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // silent fallback
        }
        speechRecognitionRef.current = null;
      }
    };
  }, [isCallActive, softphoneSession.isMuted, softphoneSession.startTime]);

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
      void refreshScheduledCallInbox();
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [activityRefreshToken, identity?.role, isIdentityLoading, refreshScheduledCallInbox]);

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
    };
  }, []);

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
          setNotificationToast(error instanceof Error ? error.message : "Poznámky k leadu se nepodařily načíst.");
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

      // Načtení přehledu konverzace nesmí přerušit běžící hovor: serverová část
      // volá get_current_lead, které převádí stav in_progress na awaiting_outcome
      // (recovery). Během hovoru proto přehled neobnovujeme; po ukončení hovoru
      // se načte znovu, protože se změní assignmentState.
      if (assignmentState === "in_progress") return;

      setIsConversationBriefLoading(true);
      setConversationBriefError(null);
      try {
        const brief = await getConversationBriefAction(activeLeadId);
        if (!cancelled) setConversationBrief(brief);
      } catch (error) {
        if (!cancelled) {
          setConversationBrief(null);
          setConversationBriefError(error instanceof Error ? error.message : "Přehled konverzace se nepodařil načíst.");
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
    if (isLoading || loadError) return;
    setServerContext({
      queueItemId: activeQueueItemId,
      assignmentState,
      recoveryRequired,
    });
  }, [activeQueueItemId, assignmentState, isLoading, loadError, recoveryRequired, setServerContext]);

  useEffect(() => {
    if (isIdentityLoading) return;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (!identity) {
          throw new Error("Autentizovaná role pracovního prostoru není dostupná");
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
        setLoadError(error instanceof Error ? error.message : "Data pracovního prostoru se nepodařila načíst");
      }
      setIsLoading(false);
    }
    loadData();
  }, [identity, isIdentityLoading, leadIdParam, loadAttempt]);

  const completeCall = useCallback(async (
    outcome: CompletionOutcome,
    outcomeLabel: string,
    orderStatus: PostCallSummary["orderStatus"],
    orderValue = 0,
    orderProductId?: string,
    scheduledAt?: string,
    orderItems?: import("@/lib/callOrder").CallOrderItemInput[],
    operatorNote?: string,
    failReason?: FailReason,
    callSessionId = softphoneSession.id,
    queueItemId = activeQueueItemId,
    preservedDurationSeconds?: number,
    preservedTranscript?: string | null,
  ): Promise<{ callId: string; orderId?: string } | null> => {
    if (!activeLead || completionInFlightRef.current) return null;

    completionInFlightRef.current = true;
    setIsCompletionPending(true);
    setCompletionSaveState("saving");
    const durationSeconds = preservedDurationSeconds ?? (callDurationSeconds || (callStartedAt
      ? Math.max(0, Math.round((Date.parse(new Date().toISOString()) - Date.parse(callStartedAt)) / 1000))
      : softphoneSession.durationSeconds));
    const recordedTranscript = preservedTranscript ?? (transcriptEntriesRef.current.length > 0
      ? JSON.stringify(transcriptEntriesRef.current)
      : null);
    const transcriptStatus: PostCallSummary["transcriptStatus"] = recordedTranscript ? "captured" : "unavailable";
    try {
      if (identity?.role === "operator") {
        if (!queueItemId) {
          throw new Error("Pro dokončení hovoru není dostupné aktivní serverové přiřazení");
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
          transcript: recordedTranscript,
          scheduled_at: queueOutcome === "followup_scheduled" ? scheduledAt || null : null,
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
        setAssistancePending(false);
        setActiveLead(nextAssignment?.lead || null);
        setLeads(nextAssignment ? [nextAssignment.lead] : []);

        const workflowEntries = completion.workflowDispatches.flatMap((dispatch) => dispatch.entries);
        setPostCallSummary({
          leadName: activeLead.full_name,
          outcomeLabel,
          durationSeconds: completion.duration_seconds,
          orderStatus,
          transcriptStatus,
          orderId: completion.order_id || undefined,
          failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
          operatorNote: operatorNote?.trim() || undefined,
          workflowEntries,
          workflowDispatches: completion.workflowDispatches,
        });
        transcriptEntriesRef.current = [];
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
        transcript: recordedTranscript,
        operator_note: operatorNote?.trim() || null,
        fail_reason: failReason || null,
        scheduled_at: outcome === "followup_scheduled" ? scheduledAt || null : null,
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
        transcriptStatus,
        orderId: completion.order_id || undefined,
        failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
        operatorNote: operatorNote?.trim() || undefined,
        workflowEntries,
        workflowDispatches: completion.workflowDispatches,
      });
      transcriptEntriesRef.current = [];
      setCompletionSaveState("saved");
      retryCompletionRef.current = null;
      setCallEndedInSession(false);
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
          scheduledAt,
          orderItems,
          operatorNote,
          failReason,
          preservedTranscript: recordedTranscript,
        },
      );
      setPostCallSummary({
        leadName: activeLead.full_name,
        outcomeLabel,
        durationSeconds,
        orderStatus,
        transcriptStatus,
        failReasonLabel: failReason ? getFailReasonLabel(failReason) : undefined,
        operatorNote: operatorNote?.trim() || undefined,
        workflowEntries: [],
        workflowDispatches: [],
      });
      setNotificationToast(
        error instanceof Error
          ? `Dokončení hovoru selhalo: ${error.message}`
          : "Dokončení hovoru selhalo. Nebyl zaznamenán žádný úspěšný souhrn."
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
      payload.scheduledAt,
      payload.orderItems,
      payload.operatorNote,
      payload.failReason,
      payload.callSessionId,
      payload.queueItemId,
      payload.durationSeconds,
      payload.preservedTranscript,
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
          .catch((error) => setNotificationToast(error instanceof Error ? error.message : "Obnova zahájení hovoru selhala."));
      }
      return;
    }

    if (isAwaitingOutcome) {
      setNotificationToast("Před zahájením dalšího hovoru zvolte výsledek po hovoru.");
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
            setCallEndedInSession(true);
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
            setNotificationToast(error instanceof Error ? `Hovor se nepodařilo bezpečně ukončit: ${error.message}` : "Hovor se nepodařilo bezpečně ukončit.");
          })
          .finally(() => setIsEndCallPending(false));
        return;
      }

      setScheduleModalError(null);
      setIsScheduleModalOpen(true);
    } else {
      // Start Outbound Call
      if (!activeLead) {
        setNotificationToast("Před zahájením hovoru vyberte lead.");
        return;
      }

      if (identity?.role === "operator") {
        if (!activeQueueItemId) {
          setNotificationToast("Pro tento hovor není dostupné žádné aktivní serverové přiřazení.");
          return;
        }
        if (assignmentState !== "assigned") {
          setNotificationToast("Serverové přiřazení vyžaduje obnovu před zahájením dalšího hovoru.");
          return;
        }

        if (callStartPendingRef.current) return;
        if (callStartRecoveryRef.current) {
          setNotificationToast("Obnova zahájení hovoru stále probíhá. Počkejte na její dokončení nebo znovu načtěte pracovní prostor.");
          return;
        }
        setCallEndedInSession(false);
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
              throw new Error("Server neaktivoval přiřazení leadu");
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
              "Vypršel čas pro spuštění zvuku",
            );
            if (!audioReady) throw new Error("Zvukové spojení se nepodařilo spustit");
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
                  setNotificationToast("Zahájení hovoru vypršelo, ale serverové přiřazení bylo obnoveno. Můžete to zkusit znovu.");
                })
                .catch(() => {
                  setNotificationToast("Zahájení hovoru vypršelo. Znovu načtěte pracovní prostor pro obnovu serverového přiřazení před opakováním.");
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
                ? `Obnova zahájení hovoru selhala: ${recoveryError.message}. Před dalším pokusem znovu načtěte pracovní prostor.`
                : error instanceof Error
                  ? `Hovor se nepodařilo zahájit: ${error.message}`
                  : "Hovor se nepodařilo zahájit. Nebyla zaznamenána žádná CRM aktivita."
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
          if (!audioReady) throw new Error("Zvukové spojení se nepodařilo spustit");
        })
        .catch((error) => {
          if (stopAudioRef.current) {
            stopAudioRef.current();
            stopAudioRef.current = null;
          }
          softphoneController.cancelDial();
          setNotificationToast(
            error instanceof Error
              ? `Hovor se nepodařilo zahájit: ${error.message}`
              : "Hovor se nepodařilo zahájit. Nebyla zaznamenána žádná CRM aktivita."
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

  const handleAcceptIncomingCall = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    setIsIncomingCallOpen(false);
    void softphoneController.answer()
      .then((audioReady) => {
        if (!audioReady) throw new Error("Zvukové spojení se nepodařilo spustit");
      })
      .catch((error) => {
        setNotificationToast(
          error instanceof Error
            ? `Příchozí hovor se nepodařilo přijmout: ${error.message}`
            : "Příchozí hovor se nepodařilo přijmout."
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
        setNotificationToast("Vytvoření objednávky není dostupné, protože aktivní přiřazení nebylo možné ověřit.");
        return;
      }
      setNotificationToast(null);
      router.push(`/orders/new?leadId=${encodeURIComponent(activeLead.id)}&origin=workspace&mode=call&callSessionId=${encodeURIComponent(softphoneSession.id)}`);
      return;
    }

    if (outcome === "schedule") {
      setScheduleModalError(null);
      setIsScheduleModalOpen(true);
      return;
    }

    const outcomeConfig: Record<Exclude<CallOutcome, "order">, [CompletionOutcome, string]> = {
      call_later: ["no_answer", "Nedostupný"],
      schedule: ["followup_scheduled", "Naplánovaný hovor"],
      fail: ["objection_handled", "Neúspěšný"],
    };
    const [callOutcome, outcomeLabel] = outcomeConfig[outcome];
    void completeCall(callOutcome, outcomeLabel, "not_created", 0, undefined, undefined, undefined, failDetails?.note, failDetails?.failReason);
  }, [activeLead, activeQueueItemId, completeCall, isAwaitingOutcome, router, softphoneSession.id]);

  const handleScheduleCall = async (scheduledAt: string) => {
    if (!isAwaitingOutcome) return;
    setIsScheduleModalPending(true);
    setScheduleModalError(null);
    const completion = await completeCall(
      "followup_scheduled",
      "Naplánovaný hovor",
      "not_created",
      0,
      undefined,
      scheduledAt,
    );
    if (completion) {
      setIsScheduleModalOpen(false);
    } else {
      setScheduleModalError("Naplánovaný hovor se nepodařilo uložit. Zkontrolujte aktivní přiřazení a zkuste to znovu.");
    }
    setIsScheduleModalPending(false);
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
      if (isIncomingCallOpen || isScheduleModalOpen) return;

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
        case "schedule_call":
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
            noteInput.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
              block: "center",
            });
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [identity?.role, isIncomingCallOpen, isScheduleModalOpen, isCallActive, handleToggleCall, handleCallOutcome]);

  const operatorConsoleState: OperatorConsoleState = isLoading
    ? "loading"
    : loadError
      ? "load_error"
      : postCallSummary
        ? "post_call_summary"
        : identity?.role === "operator" && !activeLead
          ? "waiting_assignment"
          : isScheduleModalOpen
            ? "schedule_modal"
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
    loading: { label: "Načítání", tone: "neutral" as const },
    load_error: { label: "Nedostupné", tone: "unavailable" as const },
    waiting_assignment: { label: "Čekání na přiřazení", tone: "neutral" as const },
    ready: { label: "Připraveno k přiřazení", tone: "neutral" as const },
    dialing: { label: "Vytáčení", tone: "neutral" as const },
    in_call: { label: "Na hovoru", tone: "neutral" as const },
    awaiting_outcome: { label: "Čekání na výsledek", tone: "warning" as const },
    schedule_modal: { label: "Naplánovaný hovor", tone: "warning" as const },
    completion_pending: { label: "Ukládání výsledku", tone: "warning" as const },
    recovery_required: { label: "Vyžadována obnova", tone: "warning" as const },
    post_call_summary: { label: "Hovor dokončen", tone: "neutral" as const },
  }[operatorConsoleState];

  const operatorActionState: OperatorNextActionState = operatorConsoleState === "loading" || operatorConsoleState === "load_error"
    ? "waiting_assignment"
    : operatorConsoleState;

  const handleNextAction = useCallback(() => {
    if (operatorConsoleState === "waiting_assignment") {
      void refreshOperatorAssignment();
      return;
    }

    if (operatorConsoleState === "recovery_required") {
      const outcomePanel = document.getElementById("call-outcome-panel");
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      outcomePanel?.scrollIntoView({ behavior, block: "center" });
      document.getElementById("call-outcome-panel-title")?.focus({ preventScroll: true });
      return;
    }

    if (operatorConsoleState === "awaiting_outcome" || operatorConsoleState === "schedule_modal") {
      document.getElementById("call-outcome-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      });
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
      scheduledCalls={scheduledCalls}
      isScheduledCallsLoading={isScheduledCallsLoading}
      scheduledCallError={scheduledCallInboxError}
      isAssignmentRefreshing={isAssignmentRefreshing}
      onPrimaryAction={handleNextAction}
      onRefreshScheduledCalls={() => void refreshScheduledCallInbox()}
    />
  ) : null;

  const operatorLeadHeader = (
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
      callEndedInSession={callEndedInSession}
      onToggleCall={handleToggleCall}
      onToggleMute={() => softphoneController.toggleMute()}
      onRequestHelp={identity?.role === "operator" ? requestAssistance : undefined}
      assistancePending={assistancePending}
      onCallOutcome={identity?.role === "operator" ? handleCallOutcome : undefined}
      onScheduleCall={identity?.role === "operator" ? () => {
        setScheduleModalError(null);
        setIsScheduleModalOpen(true);
      } : undefined}
      onCreateOrder={identity?.role === "operator" ? undefined : () => {
        if (isCallActive || isDialing) {
          setNotificationToast("Dokončete aktivní hovor před otevřením vytvoření objednávky.");
          return;
        }
        if (!activeLead) return;
        setNotificationToast(null);
        router.push(`/orders/new?leadId=${encodeURIComponent(activeLead.id)}&origin=workspace`);
      }}
      onSimulateIncoming={handleSimulateIncoming}
      showIncomingSimulator={identity?.role !== "operator"}
    />
  );

  const conversationBriefCard = identity?.role === "operator" && activeLead ? (
    <ConversationBriefCard
      brief={conversationBrief}
      isLoading={isConversationBriefLoading || (!conversationBrief && !conversationBriefError)}
      error={conversationBriefError}
    />
  ) : null;

  const productScriptPanel = (
    <div className="min-h-[34rem] min-w-0 flex-1">
      <ProductScriptPanel
        isCallActive={isCallActive}
        product={products[0]}
        activeSnapshot={softphoneSession.scriptSnapshot}
        isExpanded={isScriptExpanded}
        onToggleExpand={() => {
          setIsScriptExpanded((current) => {
            const next = !current;
            if (!next) setIsObjectionCatalogOpen(false);
            return next;
          });
        }}
        onOpenObjections={() => setIsObjectionCatalogOpen(true)}
        discoveryQuestions={getProductScript(products[0]).discoveryQuestions}
      />
    </div>
  );

  const supportingContextRail = (
    <aside className="min-w-0 space-y-4 border-zinc-800/70 xl:border-l xl:pl-4" aria-label="Podpůrný kontext zákazníka" data-testid="supporting-context-rail">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Historie zákazníka</p>
          <p className="mt-1 text-[11px] text-zinc-500">Časová osa, poznámky a otázky — jen na pohled, nic zde neblokuje váš hovor</p>
        </div>
        <StatusBadge tone="neutral">Historie</StatusBadge>
      </div>
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
      {activeLead && <RecentContextRow leadId={activeLead.id} refreshToken={activityRefreshToken} />}
      <Surface variant="inset" className="w-full">
        <section className="p-3">
        {activeLead ? (
          <CustomerTimelineCard leadId={activeLead.id} refreshToken={activityRefreshToken} includeNotes={false} />
        ) : (
          <p className="text-sm text-zinc-400">Není vybrán žádný aktivní zákazník.</p>
        )}
        </section>
      </Surface>
    </aside>
  );

  const pageHeader = (
    <PageHeader
      icon={PhoneCall}
      title="Operátorská konzole"
      description="Obsluha přiřazeného zákazníka na jednom místě — podklad, schválený skript a výsledek hovoru."
      badge={pageHeaderBadge}
      actionsLayout="stacked"
      actions={operatorNextActionPanel}
    />
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-none space-y-4">
        {pageHeader}
        <div className="flex min-h-[400px] items-center justify-center text-xs text-zinc-400">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin text-zinc-300" />
          <span>Načítání operátorského pracovního prostředí...</span>
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
            <h2 className="font-semibold">Data pracovního prostoru se nepodařilo načíst</h2>
            <p className="mt-2 text-xs text-rose-300">{loadError}</p>
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Zkusit znovu
              </Button>
            </div>
          </div>
        </StatusAlert>
      </div>
    );
  }

  if (identity?.role === "operator" && !activeLead && !postCallSummary) {
    return (
      <div className="mx-auto max-w-none space-y-4 px-3 sm:px-4">
        {pageHeader}
      </div>
    );
  }

  return (
      <div className="mx-auto min-w-0 max-w-none space-y-4 px-3 sm:px-4 animate-in fade-in duration-120 ease-interface" data-testid="operator-console" data-state={operatorConsoleState}>
      {pageHeader}
      
      {/* Toast Notification Banner */}
      {notificationToast && (
        <StatusAlert tone="neutral" className="w-full animate-in fade-in slide-in-from-top-2 duration-150 ease-interface" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-100">
          <span>{notificationToast}</span>
          <Button variant="quiet" onClick={() => setNotificationToast(null)} aria-label="Zavřít oznámení">
            <X className="w-3.5 h-3.5" />
          </Button>
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
      {isScriptExpanded ? (
        <div className="space-y-4" data-testid="operator-focus-workspace">
          <section key={activeLead?.id} className="flex min-h-0 min-w-0 flex-col gap-4 animate-in fade-in duration-150 ease-interface" aria-label="Soustředěný pracovní prostor operátora">
            {operatorLeadHeader}
            {conversationBriefCard}
            {productScriptPanel}
          </section>
          <div className="min-w-0" data-testid="focus-client-details">
            {supportingContextRail}
          </div>
        </div>
) : (
        <div className="grid h-auto min-h-[calc(100vh-12rem)] grid-cols-1 gap-4 xl:h-[calc(100vh-12rem)] xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section key={activeLead?.id} className="flex min-h-0 min-w-0 flex-col gap-4 overflow-visible xl:overflow-hidden animate-in fade-in duration-150 ease-interface" aria-label="Hlavní pracovní prostor operátora" data-testid="operator-primary-work-area">
            {operatorLeadHeader}
            {conversationBriefCard}
            {productScriptPanel}
          </section>
          <div className="min-w-0 xl:h-full xl:overflow-y-auto" data-testid="focus-client-details">
            {supportingContextRail}
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

      <ScheduleCallModal
        isOpen={isScheduleModalOpen}
        leadName={activeLead?.full_name}
        isSubmitting={isScheduleModalPending}
        errorMessage={scheduleModalError}
        onClose={() => {
          if (!isScheduleModalPending) setIsScheduleModalOpen(false);
        }}
        onSchedule={handleScheduleCall}
      />

      {products[0] && (
        <ObjectionDrawer
          product={products[0]}
          isOpen={isObjectionCatalogOpen && Boolean(isScriptExpanded)}
          canManage={false}
          onClose={() => setIsObjectionCatalogOpen(false)}
        />
      )}

    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] text-zinc-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-zinc-300" />
        <span>Načítání pracovního prostoru…</span>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
