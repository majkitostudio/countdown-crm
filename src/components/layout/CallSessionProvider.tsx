"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { abortLeadCallStartAction, endLeadCallAction, heartbeatLeadAssignmentAction } from "@/app/actions/leadQueue";
import { softphoneController, type CallSession } from "@/lib/telephony/softphone";

export type ServerCallAssignmentState = "assigned" | "in_progress" | "awaiting_outcome" | null;

export interface ServerCallContext {
  queueItemId: string | null;
  assignmentState: ServerCallAssignmentState;
  recoveryRequired: boolean;
}

interface CallSessionContextValue {
  session: CallSession;
  serverContext: ServerCallContext;
  isActionPending: boolean;
  error: string | null;
  setServerContext: (context: ServerCallContext) => void;
  clearError: () => void;
  cancelDial: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => boolean;
  toggleHold: () => boolean;
}

const EMPTY_CONTEXT: ServerCallContext = { queueItemId: null, assignmentState: null, recoveryRequired: false };
const CallSessionContext = createContext<CallSessionContextValue | null>(null);

export function CallSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CallSession>(() => softphoneController.getSession());
  const [serverContext, setServerContextState] = useState<ServerCallContext>(EMPTY_CONTEXT);
  const [isActionPending, setIsActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serverContextRef = useRef(serverContext);

  useEffect(() => softphoneController.subscribeState(setSession), []);

  const setServerContext = useCallback((context: ServerCallContext) => {
    serverContextRef.current = context;
    setServerContextState(context);
  }, []);

  const runAction = useCallback(async (action: () => Promise<void>) => {
    if (isActionPending) return;
    setIsActionPending(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Call update failed.");
      throw cause;
    } finally {
      setIsActionPending(false);
    }
  }, [isActionPending]);

  const cancelDial = useCallback(async () => runAction(async () => {
    const context = serverContextRef.current;
    softphoneController.cancelDial();
    if (!context.queueItemId) return;
    const assignment = await abortLeadCallStartAction(context.queueItemId, "Operator cancelled call start");
    setServerContext({
      queueItemId: assignment.queue_item_id,
      assignmentState: assignment.assignment_state,
      recoveryRequired: assignment.recovery_required,
    });
  }), [runAction, setServerContext]);

  const endCall = useCallback(async () => runAction(async () => {
    const context = serverContextRef.current;
    const assignment = context.queueItemId
      ? await endLeadCallAction(context.queueItemId)
      : null;
    softphoneController.hangup();
    if (assignment) {
      setServerContext({
        queueItemId: assignment.queue_item_id,
        assignmentState: assignment.assignment_state,
        recoveryRequired: assignment.recovery_required,
      });
    }
  }), [runAction, setServerContext]);

  useEffect(() => {
    const { queueItemId, assignmentState } = serverContext;
    if (!queueItemId || (assignmentState !== "in_progress" && assignmentState !== "awaiting_outcome")) return;
    const heartbeat = () => {
      void heartbeatLeadAssignmentAction(queueItemId).catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Lead assignment heartbeat failed.");
      });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [serverContext]);

  const value = useMemo(() => ({
    session, serverContext, isActionPending, error, setServerContext,
    clearError: () => setError(null), cancelDial, endCall,
    toggleMute: () => softphoneController.toggleMute(),
    toggleHold: () => softphoneController.toggleHold(),
  }), [cancelDial, endCall, error, isActionPending, serverContext, session, setServerContext]);

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>;
}

export function useCallSession(): CallSessionContextValue {
  const context = useContext(CallSessionContext);
  if (!context) throw new Error("useCallSession must be used inside CallSessionProvider");
  return context;
}
