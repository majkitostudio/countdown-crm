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
  remoteVolume: number;
  supportsRemoteVolume: boolean;
  setRemoteVolume: (volume: number) => void;
}

const EMPTY_CONTEXT: ServerCallContext = { queueItemId: null, assignmentState: null, recoveryRequired: false };
const CallSessionContext = createContext<CallSessionContextValue | null>(null);

export function CallSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CallSession>(() => softphoneController.getSession());
  const [serverContext, setServerContextState] = useState<ServerCallContext>(EMPTY_CONTEXT);
  const [isActionPending, setIsActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteVolume, setRemoteVolumeState] = useState(() => softphoneController.getRemoteAudioVolume());
  const serverContextRef = useRef(serverContext);

  useEffect(() => softphoneController.subscribeState(setSession), []);

  useEffect(() => {
    const isCallActive = ["dialing", "ringing", "connected", "on_hold"].includes(session.state);
    if (!isCallActive) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [session.state]);

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
      setError(cause instanceof Error ? cause.message : "Aktualizace hovoru se nezdařila.");
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

  const setRemoteVolume = useCallback((volume: number) => {
    setRemoteVolumeState(softphoneController.setRemoteAudioVolume(volume));
  }, []);

  useEffect(() => {
    const { queueItemId, assignmentState } = serverContext;
    if (!queueItemId || (assignmentState !== "in_progress" && assignmentState !== "awaiting_outcome")) return;
    let stopped = false;
    const heartbeat = () => {
      if (stopped) return;
      void heartbeatLeadAssignmentAction(queueItemId)
        .then((result) => {
          if (result === null) stopped = true;
        })
        .catch((cause) => {
          setError(cause instanceof Error ? cause.message : "Obnovení přiřazení leadu se nezdařilo.");
        });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [serverContext]);

  const value = useMemo(() => ({
    session, serverContext, isActionPending, error, setServerContext,
    clearError: () => setError(null), cancelDial, endCall,
    toggleMute: () => softphoneController.toggleMute(),
    toggleHold: () => softphoneController.toggleHold(),
    remoteVolume,
    supportsRemoteVolume: softphoneController.supportsRemoteAudioVolume(),
    setRemoteVolume,
  }), [cancelDial, endCall, error, isActionPending, remoteVolume, serverContext, session, setRemoteVolume, setServerContext]);

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>;
}

export function useCallSession(): CallSessionContextValue {
  const context = useContext(CallSessionContext);
  if (!context) throw new Error("useCallSession musí být použito uvnitř CallSessionProvider");
  return context;
}
