"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, X } from "lucide-react";

interface CallbackScheduleModalProps {
  isOpen: boolean;
  leadName?: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSchedule: (scheduledAt: string) => Promise<void>;
}

function toLocalInputValue(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function CallbackScheduleModal({
  isOpen,
  leadName,
  isSubmitting,
  errorMessage,
  onClose,
  onSchedule,
}: CallbackScheduleModalProps) {
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [validationError, setValidationError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusFrame = window.requestAnimationFrame(() => dateInputRef.current?.focus());
      return () => window.cancelAnimationFrame(focusFrame);
    }

    const previousFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (!previousFocus) return;

    const restoreFrame = window.requestAnimationFrame(() => {
      if (document.contains(previousFocus)) previousFocus.focus();
    });
    return () => window.cancelAnimationFrame(restoreFrame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        setValidationError(null);
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    const visibleError = validationError || errorMessage;
    if (!isOpen || !visibleError) return;

    const focusFrame = window.requestAnimationFrame(() => errorRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [errorMessage, isOpen, validationError]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = new Date(scheduledAt);
    if (!scheduledAt || !Number.isFinite(parsed.getTime())) {
      setValidationError("Vyberte platné datum a čas callbacku.");
      return;
    }
    setValidationError(null);
    await onSchedule(parsed.toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="callback-dialog-title">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-sky-950/50 p-2 text-sky-300"><CalendarClock className="h-4 w-4" /></div>
            <div>
              <h2 id="callback-dialog-title" className="text-base font-semibold text-zinc-100">Schedule Callback</h2>
              <p className="mt-1 text-xs text-zinc-500">{leadName || "Current lead"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-300">Callback date and time</span>
          <input ref={dateInputRef} type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} min={toLocalInputValue(new Date())} required className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-600" />
          <span className="block text-[11px] text-zinc-600">Časová zóna browseru: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </label>

        {(validationError || errorMessage) && <div ref={errorRef} role="alert" tabIndex={-1} className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">{validationError || errorMessage}</div>}

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white disabled:opacity-50">{isSubmitting ? "Scheduling…" : "Schedule callback"}</button>
        </div>
      </form>
    </div>
  );
}
