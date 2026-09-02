"use client";

import Link from "next/link";
import { Mic, MicOff, Pause, PhoneOff, Play, Radio } from "lucide-react";
import { softphoneController } from "@/lib/telephony/softphone";
import { useCallController } from "./CallControllerProvider";

function formatTimer(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function FloatingCallController() {
  const { session, callContext, requestToggleCall } = useCallController();
  const isDialing = session.state === "dialing" || session.state === "ringing";
  const isCallActive = session.state === "connected" || session.state === "on_hold";
  const showOutcomeRequired = !isDialing && !isCallActive && callContext.isAwaitingOutcome;

  if (!isDialing && !isCallActive && !showOutcomeRequired) return null;

  if (showOutcomeRequired) {
    return (
      <aside
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center sm:inset-x-auto sm:right-5 sm:bottom-5"
        aria-label="Floating call controller"
      >
        <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-2xl border border-amber-800/70 bg-zinc-950/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-md">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Outcome required</p>
            <p className="mt-1 text-xs text-zinc-300">Finish the current call outcome before taking another call.</p>
          </div>
          <Link href="/workspace" className="shrink-0 rounded-lg bg-amber-200 px-3 py-2 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
            Open workspace
          </Link>
        </div>
      </aside>
    );
  }

  const stateLabel = session.state === "on_hold" ? "On hold" : isDialing ? (session.state === "ringing" ? "Ringing" : "Dialing") : "Active call";
  const leadName = callContext.leadName || session.leadName || "Current lead";
  const leadPhone = callContext.leadPhone || session.phone;

  return (
    <aside
      className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center sm:inset-x-auto sm:right-5 sm:bottom-5"
      aria-label="Floating call controller"
      data-testid="floating-call-controller"
      data-state={session.state}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${isDialing ? "bg-sky-400" : session.state === "on_hold" ? "bg-amber-400" : "bg-rose-500"}`}>
              {isCallActive && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{stateLabel}</p>
              <p className="truncate text-xs font-semibold text-zinc-100">{leadName}{leadPhone ? <span className="ml-2 font-mono text-[10px] font-normal text-zinc-500">{leadPhone}</span> : null}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-sm text-zinc-100" aria-label="Call duration">
            {isDialing && <Radio className="h-3.5 w-3.5 animate-spin text-sky-300" aria-hidden="true" />}
            {formatTimer(session.durationSeconds)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {isCallActive && (
            <>
              <button type="button" onClick={() => softphoneController.toggleMute()} aria-label={session.isMuted ? "Unmute microphone" : "Mute microphone"} title={session.isMuted ? "Unmute microphone" : "Mute microphone"} className={`rounded-lg border p-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${session.isMuted ? "border-amber-700 bg-amber-950/50 text-amber-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>
                {session.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => softphoneController.toggleHold()} aria-label={session.isOnHold ? "Resume call" : "Put call on hold"} title={session.isOnHold ? "Resume call" : "Put call on hold"} className={`rounded-lg border p-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${session.isOnHold ? "border-sky-700 bg-sky-950/50 text-sky-200" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>
                {session.isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </>
          )}
          <button type="button" onClick={requestToggleCall} aria-label={isDialing ? "Cancel dialing" : "End call"} title={isDialing ? "Cancel dialing" : "End call"} className="inline-flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-900/80 px-3 py-2 text-[11px] font-semibold text-rose-100 transition-colors hover:bg-rose-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">
            <PhoneOff className="h-4 w-4" />
            <span>{isDialing ? "Cancel" : "End call"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
