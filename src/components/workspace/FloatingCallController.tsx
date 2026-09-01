"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Mic, MicOff, Pause, PhoneCall, PhoneOff, Play, Radio } from "lucide-react";
import { useCallSession } from "@/components/layout/CallSessionProvider";

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function formatTimer(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function getStatusLabel(
  state: ReturnType<typeof useCallSession>["session"]["state"],
  assignmentState: ReturnType<typeof useCallSession>["assignmentState"],
  recoveryRequired: boolean,
): string {
  if (recoveryRequired) return "Recovery required";
  if (assignmentState === "awaiting_outcome") return "Outcome required";
  if (state === "dialing") return "Dialing";
  if (state === "ringing") return "Ringing";
  if (state === "on_hold") return "On hold";
  if (state === "connected") return "In call";
  return "Call unavailable";
}

export function FloatingCallController() {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const {
    session,
    assignmentState,
    recoveryRequired,
    isActionPending,
    error,
    clearError,
    cancelDial,
    endCall,
    toggleMute,
    toggleHold,
  } = useCallSession();

  const isDialing = session.state === "dialing" || session.state === "ringing";
  const isCallActive = session.state === "connected" || session.state === "on_hold";
  const isAwaitingOutcome = assignmentState === "awaiting_outcome";
  const isVisible = mounted && (isDialing || isCallActive || isAwaitingOutcome || recoveryRequired);
  if (!isVisible) return null;

  const statusLabel = getStatusLabel(session.state, assignmentState, recoveryRequired);
  const isOutcomeState = isAwaitingOutcome || recoveryRequired;

  const controller = (
    <aside
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl"
      data-testid="floating-call-controller"
      data-call-state={session.state}
      aria-label="Floating call controller"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            {isDialing ? <Radio className="h-3.5 w-3.5 animate-spin text-sky-300" aria-hidden="true" /> : <PhoneCall className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />}
            <span>{statusLabel}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{session.leadName || "Current customer"}</p>
          {session.phone && <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{session.phone}</p>}
        </div>
        {!isOutcomeState && <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-zinc-100">{formatTimer(session.durationSeconds)}</span>}
      </div>

      {isOutcomeState ? (
        <div className="mt-3 rounded-xl border border-amber-900/70 bg-amber-950/30 p-3" role="status" aria-live="polite">
          <p className="text-xs font-semibold text-amber-100">Post-call outcome required</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
            {recoveryRequired ? "The call was interrupted. The lead remains assigned for recovery." : "Return to the workspace to finish this call."}
          </p>
          <Link href="/workspace" className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-semibold text-amber-950 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-950">
            Open workspace
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2" role="group" aria-label="Call controls">
            <button
              type="button"
              onClick={() => void (isDialing ? cancelDial() : endCall())}
              disabled={isActionPending}
              aria-busy={isActionPending}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDialing ? <Radio className="h-4 w-4" aria-hidden="true" /> : <PhoneOff className="h-4 w-4" aria-hidden="true" />}
              {isActionPending ? "Updating…" : isDialing ? "Cancel dial" : "End call"}
            </button>
            {isCallActive && (
              <>
                <button
                  type="button"
                  onClick={() => { clearError(); toggleMute(); }}
                  aria-label={session.isMuted ? "Unmute microphone" : "Mute microphone"}
                  title={session.isMuted ? "Unmute microphone" : "Mute microphone"}
                  className={`min-h-10 rounded-lg border p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${session.isMuted ? "border-amber-700 bg-amber-950/50 text-amber-100" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"}`}
                >
                  {session.isMuted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => { clearError(); toggleHold(); }}
                  aria-label={session.isOnHold ? "Resume call" : "Put call on hold"}
                  title={session.isOnHold ? "Resume call" : "Put call on hold"}
                  className={`min-h-10 rounded-lg border p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${session.isOnHold ? "border-sky-700 bg-sky-950/50 text-sky-100" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"}`}
                >
                  {session.isOnHold ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                </button>
              </>
            )}
          </div>
          {error && (
            <div className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-rose-900/70 bg-rose-950/30 p-2.5 text-[11px] text-rose-200" role="alert">
              <span>{error}</span>
              <button type="button" onClick={clearError} aria-label="Dismiss call error" className="shrink-0 text-rose-300 hover:text-white">×</button>
            </div>
          )}
        </>
      )}
    </aside>
  );

  return createPortal(controller, document.body);
}
