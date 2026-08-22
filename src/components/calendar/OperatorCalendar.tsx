"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  cancelReminderAction,
  completeReminderAction,
  createReminderAction,
  listCalendarEntriesAction,
  updateReminderAction,
} from "@/app/actions/calendar";
import type { CalendarEntryDTO } from "@/lib/dal/calendar";
import { PushReminderSettings } from "./PushReminderSettings";

type CalendarFilter = "all" | "callback" | "reminder";

interface OperatorCalendarProps {
  initialEntries: CalendarEntryDTO[];
}

interface ReminderFormState {
  title: string;
  note: string;
  dueAt: string;
  remindAt: string;
}

function toLocalInputValue(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function defaultFormState(): ReminderFormState {
  const due = new Date(Date.now() + 60 * 60 * 1000);
  const remind = new Date(due.getTime() - 15 * 60 * 1000);
  return {
    title: "",
    note: "",
    dueAt: toLocalInputValue(due),
    remindAt: toLocalInputValue(remind),
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isDue(entry: CalendarEntryDTO): boolean {
  return entry.status !== "completed" && Date.parse(entry.starts_at) <= Date.now();
}

function isReminderDue(entry: CalendarEntryDTO): boolean {
  return entry.type === "reminder" && entry.status === "open" && Boolean(entry.remind_at) && Date.parse(entry.remind_at as string) <= Date.now();
}

function entryStatus(entry: CalendarEntryDTO): { label: string; className: string } {
  if (entry.status === "completed") {
    return { label: "Completed", className: "border-emerald-900/60 bg-emerald-950/20 text-emerald-300" };
  }
  if (isDue(entry)) {
    return { label: entry.type === "callback" ? "Due" : "Overdue", className: "border-amber-900/70 bg-amber-950/20 text-amber-300" };
  }
  return { label: entry.type === "callback" ? "Scheduled" : "Open", className: "border-zinc-700 bg-zinc-950 text-zinc-300" };
}

function toIso(localValue: string, label: string): string {
  const parsed = new Date(localValue);
  if (!localValue || !Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} musí být platné datum a čas.`);
  }
  return parsed.toISOString();
}

export function OperatorCalendar({ initialEntries }: OperatorCalendarProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [form, setForm] = useState<ReminderFormState>(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await listCalendarEntriesAction());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Calendar could not be refreshed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => filter === "all" || entry.type === filter),
    [entries, filter],
  );
  const dueReminders = entries.filter(isReminderDue);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultFormState());
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditorOpen(true);
  };

  const openEdit = (entry: CalendarEntryDTO) => {
    if (entry.type !== "reminder" || !entry.reminder) return;
    setEditingId(entry.id);
    setForm({
      title: entry.reminder.title,
      note: entry.reminder.note || "",
      dueAt: toLocalInputValue(new Date(entry.reminder.due_at)),
      remindAt: toLocalInputValue(new Date(entry.reminder.remind_at)),
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditorOpen(true);
  };

  const saveReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const input = {
        title: form.title,
        note: form.note || null,
        due_at: toIso(form.dueAt, "Due time"),
        remind_at: toIso(form.remindAt, "Reminder time"),
      };
      if (editingId) await updateReminderAction(editingId, input);
      else await createReminderAction(input);
      await refresh();
      setIsEditorOpen(false);
      setSuccessMessage(editingId ? "Reminder byl upraven." : "Reminder byl uložen.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reminder could not be saved.");
    } finally {
      setIsLoading(false);
    }
  };

  const runReminderAction = async (entry: CalendarEntryDTO, action: () => Promise<unknown>, message: string) => {
    setBusyId(entry.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
      await refresh();
      setSuccessMessage(message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reminder action could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
      {dueReminders.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-amber-200" role="status">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="text-xs font-semibold">Připomínka je splatná</div>
            <div className="mt-1 text-xs text-amber-200/75">{dueReminders.map((entry) => entry.title).join(" · ")}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Upcoming work</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Zobrazení obsahuje minulých 7 dní a následujících 14 dní. Časová zóna: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void refresh()} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50">
            <RefreshCw className={isLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-white">
            <Plus className="h-3.5 w-3.5" /> New reminder
          </button>
        </div>
      </div>

      {successMessage && <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs text-emerald-300" role="status">{successMessage}</div>}
      {errorMessage && <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300" role="alert">{errorMessage}</div>}

      <PushReminderSettings />

      <div className="flex flex-wrap gap-2">
        {(["all", "callback", "reminder"] as CalendarFilter[]).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filter === value ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300"}`}>
            {value === "all" ? "All" : value === "callback" ? "Callbacks" : "Reminders"}
          </button>
        ))}
      </div>

      {visibleEntries.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-10 text-center text-xs text-zinc-500">Žádné callbacky ani reminders v tomto období.</div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const status = entryStatus(entry);
            const isBusy = busyId === entry.id;
            return (
              <article key={`${entry.type}-${entry.id}`} className={`rounded-xl border p-4 ${isDue(entry) ? "border-amber-900/60 bg-amber-950/10" : "border-zinc-800 bg-zinc-950/50"}`}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-2 ${entry.type === "callback" ? "bg-sky-950/50 text-sky-300" : "bg-violet-950/50 text-violet-300"}`}>
                      {entry.type === "callback" ? <CalendarClock className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-zinc-100">{entry.title}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}>{status.label}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-zinc-600" />{formatDate(entry.starts_at)}</span>
                        {entry.remind_at && <span className="inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-zinc-600" />Reminder {formatDate(entry.remind_at)}</span>}
                      </div>
                      {entry.lead && <div className="mt-2 text-xs text-zinc-500">Lead: {entry.lead.full_name} · {entry.lead.phone}</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {entry.lead && <Link href={`/leads/${entry.lead.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"><ExternalLink className="h-3.5 w-3.5" /> Open lead</Link>}
                    {entry.type === "reminder" && entry.status === "open" && <>
                      <button type="button" onClick={() => openEdit(entry)} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                      <button type="button" onClick={() => void runReminderAction(entry, () => completeReminderAction(entry.id), "Reminder byl dokončen.")} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900/60 px-2.5 py-2 text-[11px] text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Complete</button>
                      <button type="button" onClick={() => void runReminderAction(entry, () => cancelReminderAction(entry.id), "Reminder byl zrušen.")} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Cancel</button>
                    </>}
                    {entry.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Completed" />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title">
          <form onSubmit={saveReminder} className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="reminder-dialog-title" className="text-base font-semibold text-zinc-100">{editingId ? "Edit reminder" : "New reminder"}</h2>
                <p className="mt-1 text-xs text-zinc-500">Reminder je osobní pracovní úkol a nemění callback queue.</p>
              </div>
              <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <label className="block space-y-1.5"><span className="text-xs font-medium text-zinc-300">Title</span><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={200} required className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-600" placeholder="Např. Ověřit platbu objednávky" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-medium text-zinc-300">Note <span className="text-zinc-600">(optional)</span></span><textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} maxLength={2000} rows={3} className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-600" placeholder="Kontext pro sebe…" /></label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5"><span className="text-xs font-medium text-zinc-300">Due</span><input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} required className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-medium text-zinc-300">Remind me</span><input type="datetime-local" value={form.remindAt} onChange={(event) => setForm((current) => ({ ...current, remindAt: event.target.value }))} required className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4"><button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">Cancel</button><button type="submit" disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />{isLoading ? "Saving…" : "Save reminder"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
