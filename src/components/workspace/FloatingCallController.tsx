"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Mic, MicOff, Pause, PhoneCall, PhoneOff, Play, Radio } from "lucide-react";
import { useCallSession } from "@/components/layout/CallSessionProvider";
import { RemoteVolumeControl } from "@/components/workspace/RemoteVolumeControl";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function formatTimer(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FloatingCallController() {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { session, serverContext, isActionPending, error, clearError, cancelDial, endCall, toggleMute, toggleHold, remoteVolume, supportsRemoteVolume, setRemoteVolume } = useCallSession();
  const isDialing = session.state === "dialing" || session.state === "ringing";
  const isActive = session.state === "connected" || session.state === "on_hold";
  const hasLiveSession = isDialing || isActive;
  const requiresOutcome = serverContext.assignmentState === "awaiting_outcome" || serverContext.recoveryRequired;

  if (!mounted || (!isDialing && !isActive && !requiresOutcome)) return null;

  const status = isDialing
    ? "Vytáčení"
    : isActive
      ? session.state === "on_hold" ? "Podržený hovor" : "Na hovoru"
      : serverContext.recoveryRequired
    ? "Vyžadována obnova"
    : serverContext.assignmentState === "awaiting_outcome"
      ? "Je nutné zvolit výsledek"
      : "Hovor";

  return createPortal(
    <aside className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 ease-interface" data-testid="floating-call-controller" aria-label="Plovoucí ovládání hovoru">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            {isDialing ? <Radio className="h-3.5 w-3.5 animate-spin text-sky-300" /> : <PhoneCall className="h-3.5 w-3.5 text-rose-300" />}
            <span>{status}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold">{session.leadName || "Aktuální zákazník"}</p>
          {session.phone && <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{session.phone}</p>}
        </div>
        {hasLiveSession && <span className="font-mono text-lg font-semibold tabular-nums">{formatTimer(session.durationSeconds)}</span>}
      </div>

      {requiresOutcome && !hasLiveSession ? (
        <div className="mt-3 rounded-xl border border-amber-900/70 bg-amber-950/30 p-3" role="status">
          <p className="text-xs font-semibold text-amber-100">Je nutné zvolit výsledek hovoru</p>
          <p className="mt-1 text-[11px] text-amber-200/80">Vraťte se do pracovního prostoru a dokončete hovor. Lead vám zůstává přiřazen.</p>
          <Link href="/console" className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-semibold text-amber-950 hover:bg-white">Otevřít pracovní prostor</Link>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2" role="group" aria-label="Ovládání hovoru">
          <button type="button" onClick={() => void (isDialing ? cancelDial() : endCall())} disabled={isActionPending} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-60">
            {isDialing ? <Radio className="h-4 w-4" /> : <PhoneOff className="h-4 w-4" />}
            {isActionPending ? "Aktualizace…" : isDialing ? "Zrušit vytáčení" : "Ukončit hovor"}
          </button>
          {isActive && <>
            <button type="button" onClick={() => { clearError(); toggleMute(); }} aria-label={session.isMuted ? "Zapnout mikrofon" : "Ztlumit mikrofon"} className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-300">
              {session.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => { clearError(); toggleHold(); }} aria-label={session.isOnHold ? "Pokračovat v hovoru" : "Podržet hovor"} className="min-h-10 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-300">
              {session.isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </>}
        </div>
      )}
      {isActive && supportsRemoteVolume && (
        <RemoteVolumeControl
          value={remoteVolume}
          onChange={setRemoteVolume}
          className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
        />
      )}
      {error && <div className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-rose-900/70 bg-rose-950/30 p-2.5 text-[11px] text-rose-200" role="alert"><span>{error}</span><button type="button" onClick={clearError} aria-label="Zavřít chybu hovoru">×</button></div>}
    </aside>,
    document.body,
  );
}
