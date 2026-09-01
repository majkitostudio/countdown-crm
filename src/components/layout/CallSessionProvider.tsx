"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  abortLeadCallStartAction,
  endLeadCallAction,
  heartbeatLeadAssignmentAction,
} from "@/app/actions/leadQueue";
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
  assignmentState: ServerCallAssignmentState;
  recoveryRequired: boolean;
  isActionPending: boolean;
  error: string | null;
  setServerContext: (context: ServerCallContext) => void;
  clearError: () => void;
  cancelDial: () => Promise<Awaited<ReturnType<typeof abortLeadCallStartAction>> | null>;
  endCall: () => Promise<Awaited<ReturnType<typeof endLeadCallAction>> | null>;
  toggleMute: () => boolean;
  toggleHold: () => boolean;
}

const EMPTY_SERVER_CONTEXT: ServerCallContext = {
  queueItemId: null,
  assignmentState: null,
  recoveryRequired: false,
};

const CallSessionContext = createContext<CallSessionContextValue | null>(null);

export function CallSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CallSession>(() => softphoneController.getSession());
  const [serverContext, setServerContextState] = useState<ServerCallContext>(EMPTY_SERVER_CONTEXT);
  const [isActionPending, setIsActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(session);
  const serverContextRef = useRef(serverContext);

  useEffect(() => softphoneController.subscribeState((nextSession) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }), []);

  const setServerContext = useCallback((nextContext: ServerCallContext) => {
    serverContextRef.current = nextContext;
    setServerContextState(nextContext);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const cancelDial = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession.state !== "dialing" && currentSession.state !== "ringing") return null;
    if (isActionPending) return null;

    const currentServerContext = serverContextRef.current;
    const queueItemId = currentServerContext.queueItemId;
    setIsActionPending(true);
    setError(null);
    softphoneController.cancelDial();

    try {
      const recoveredAssignment = queueItemId
        ? await abortLeadCallStartAction(queueItemId, "Operator cancelled call start")
        : null;
      if (recoveredAssignment) {
        setServerContext({
          queueItemId: recoveredAssignment.queue_item_id,
          assignmentState: recoveredAssignment.assignment_state,
          recoveryRequired: recoveredAssignment.recovery_required,
        });
      } else if (!queueItemId) {
        setServerContext(EMPTY_SERVER_CONTEXT);
      }
      return recoveredAssignment;
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Call start recovery failed.";
      setError(message);
      if (queueItemId) {
        setServerContext({
          ...currentServerContext,
          assignmentState: "in_progress",
          recoveryRequired: true,
        });
      }
      throw cancelError;
    } finally {
      setIsActionPending(false);
    }
  }, [isActionPending, setServerContext]);

  const endCall = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (currentSession.state !== "connected" && currentSession.state !== "on_hold") return null;
    if (isActionPending) return null;

    const currentServerContext = serverContextRef.current;
    setIsActionPending(true);
    setError(null);

    try {
      const endedAssignment = currentServerContext.queueItemId
        ? await endLeadCallAction(currentServerContext.queueItemId)
        : null;

      softphoneController.hangup();
      if (endedAssignment) {
        setServerContext({
          queueItemId: endedAssignment.queue_item_id,
          assignmentState: endedAssignment.assignment_state,
          recoveryRequired: endedAssignment.recovery_required,
        });
      }
      return endedAssignment;
    } catch (endError) {
      const message = endError instanceof Error ? endError.message : "Call could not be ended safely.";
      setError(message);
      throw endError;
    } finally {
      setIsActionPending(false);
    }
  }, [isActionPending, setServerContext]);

  useEffect(() => {
    const { queueItemId, assignmentState } = serverContext;
    if (!queueItemId || (assignmentState !== "in_progress" && assignmentState !== "awaiting_outcome")) {
      return;
    }

    const sendHeartbeat = () => {
      void heartbeatLeadAssignmentAction(queueItemId).catch((heartbeatError) => {
        setError(heartbeatError instanceof Error ? heartbeatError.message : "Lead assignment heartbeat failed.");
      });
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [serverContext]);

  const value = useMemo<CallSessionContextValue>(() => ({
    session,
    serverContext,
    assignmentState: serverContext.assignmentState,
    recoveryRequired: serverContext.recoveryRequired,
    isActionPending,
    error,
    setServerContext,
    clearError,
    cancelDial,
    endCall,
    toggleMute: () => softphoneController.toggleMute(),
    toggleHold: () => softphoneController.toggleHold(),
  }), [cancelDial, clearError, endCall, error, isActionPending, serverContext, session, setServerContext]);

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>;
}

export function useCallSession(): CallSessionContextValue {
  const context = useContext(CallSessionContext);
  if (!context) throw new Error("useCallSession must be used inside CallSessionProvider");
  return context;
}
