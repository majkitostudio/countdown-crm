"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { softphoneController, type CallSession } from "@/lib/telephony/softphone";

interface RegisteredCallContext {
  leadName: string;
  leadPhone: string;
  isAwaitingOutcome: boolean;
}

interface CallControllerContextValue {
  session: CallSession;
  callContext: RegisteredCallContext;
  registerCallContext: (context: RegisteredCallContext & { onToggleCall: () => void }) => void;
  requestToggleCall: () => void;
}

const CallControllerContext = createContext<CallControllerContextValue | null>(null);

export function CallControllerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CallSession>(() => softphoneController.getSession());
  const [callContext, setCallContext] = useState<RegisteredCallContext>({
    leadName: "",
    leadPhone: "",
    isAwaitingOutcome: false,
  });
  const toggleCallRef = useRef<(() => void) | null>(null);

  useEffect(() => softphoneController.subscribeState(setSession), []);

  const registerCallContext = useCallback(
    (next: RegisteredCallContext & { onToggleCall: () => void }) => {
      toggleCallRef.current = next.onToggleCall;
      setCallContext((current) => {
        if (
          current.leadName === next.leadName &&
          current.leadPhone === next.leadPhone &&
          current.isAwaitingOutcome === next.isAwaitingOutcome
        ) {
          return current;
        }
        return {
          leadName: next.leadName,
          leadPhone: next.leadPhone,
          isAwaitingOutcome: next.isAwaitingOutcome,
        };
      });
    },
    [],
  );

  const requestToggleCall = useCallback(() => {
    if (toggleCallRef.current) {
      toggleCallRef.current();
      return;
    }

    const state = softphoneController.getSession().state;
    if (state === "dialing" || state === "ringing") {
      softphoneController.cancelDial();
    } else {
      softphoneController.hangup();
    }
  }, []);

  return (
    <CallControllerContext.Provider value={{ session, callContext, registerCallContext, requestToggleCall }}>
      {children}
    </CallControllerContext.Provider>
  );
}

export function useCallController() {
  const context = useContext(CallControllerContext);
  if (!context) throw new Error("useCallController must be used inside CallControllerProvider");
  return context;
}
