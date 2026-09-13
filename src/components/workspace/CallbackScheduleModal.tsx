"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";

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
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="callback-dialog-title" initialFocusRef={dateInputRef}>
      <form onSubmit={submit} className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-md space-y-5 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-zinc-900 p-2 text-zinc-300"><CalendarClock className="h-4 w-4" /></div>
            <div>
              <h2 id="callback-dialog-title" className="text-base font-semibold text-zinc-100">Schedule Callback</h2>
              <p className="mt-1 text-xs text-zinc-500">{leadName || "Current lead"}</p>
            </div>
          </div>
          <Button type="button" variant="quiet" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>

        <FieldLabel htmlFor="callback-scheduled-at">
          <span className="text-xs font-medium text-zinc-300">Callback date and time</span>
          <TextField id="callback-scheduled-at" ref={dateInputRef} type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} min={toLocalInputValue(new Date())} required />
          <span className="block text-[11px] text-zinc-600">Časová zóna browseru: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </FieldLabel>

        {(validationError || errorMessage) && <StatusAlert ref={errorRef} tone="danger" tabIndex={-1}>{validationError || errorMessage}</StatusAlert>}

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Scheduling…" : "Schedule callback"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
