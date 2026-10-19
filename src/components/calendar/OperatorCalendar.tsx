"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Pencil,
  PhoneCall,
  Plus,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import {
  cancelReminderAction,
  completeReminderAction,
  createReminderAction,
  listCalendarEntriesAction,
  updateReminderAction,
} from "@/app/actions/calendar";
import type { CalendarEntryDTO, CalendarLoadResult } from "@/lib/dal/calendar";
import { buildScheduleBuckets } from "@/lib/scheduleBuckets";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, TextAreaField, TextField } from "@/components/ui/Field";
import { StatusAlert, StatusBadge, type SemanticTone } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type CalendarFilter = "all" | "scheduled_call" | "reminder";

interface OperatorCalendarProps {
  initialCalendar: CalendarLoadResult;
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

function formatTimeOnly(value: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(startsAt: string, now = Date.now()): string {
  const timeMs = Date.parse(startsAt);
  const diffMs = timeMs - now;
  const absDiff = Math.abs(diffMs);
  const minutes = Math.floor(absDiff / (60 * 1000));
  const hours = Math.floor(minutes / 60);

  if (diffMs < 0) {
    if (minutes < 60) return `před ${minutes} min`;
    if (hours < 24) return `před ${hours} h`;
    const days = Math.floor(hours / 24);
    return `před ${days} dny`;
  } else {
    if (minutes < 60) return `za ${minutes} min`;
    if (hours < 24) return `za ${hours} h`;
    const days = Math.floor(hours / 24);
    return `za ${days} dny`;
  }
}

function isDue(entry: CalendarEntryDTO): boolean {
  return entry.status !== "completed" && Date.parse(entry.starts_at) <= Date.now();
}

function isReminderDue(entry: CalendarEntryDTO): boolean {
  return (
    entry.type === "reminder" &&
    entry.status === "open" &&
    Boolean(entry.remind_at) &&
    Date.parse(entry.remind_at as string) <= Date.now()
  );
}

function entryStatus(entry: CalendarEntryDTO): { label: string; tone: SemanticTone } {
  if (entry.status === "completed") {
    return { label: "Completed", tone: "success" };
  }
  if (isDue(entry)) {
    return { label: entry.type === "scheduled_call" ? "Due" : "Overdue", tone: "danger" };
  }
  return { label: entry.type === "scheduled_call" ? "Scheduled" : "Open", tone: "neutral" };
}

function toIso(localValue: string, label: string): string {
  const parsed = new Date(localValue);
  if (!localValue || !Number.isFinite(parsed.getTime())) {
    throw new Error(`${label} musí být platné datum a čas.`);
  }
  return parsed.toISOString();
}

const SOURCE_LABELS = {
  scheduledCalls: "Schedules",
  reminders: "Reminders",
} satisfies Record<keyof CalendarLoadResult["sources"], string>;

type CalendarSourceKey = keyof CalendarLoadResult["sources"];
type UnavailableCalendarSource = Extract<CalendarLoadResult["sources"][CalendarSourceKey], { state: "unavailable" }>;

export function OperatorCalendar({ initialCalendar }: OperatorCalendarProps) {
  const [calendar, setCalendar] = useState(initialCalendar);
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
      setCalendar(await listCalendarEntriesAction());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Agenda could not be refreshed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleEntries = useMemo(
    () => calendar.entries.filter((entry) => filter === "all" || entry.type === filter),
    [calendar.entries, filter],
  );

  const bucketsSummary = useMemo(() => buildScheduleBuckets(visibleEntries), [visibleEntries]);
  const dueReminders = calendar.entries.filter(isReminderDue);
  const unavailableSources = (
    Object.entries(calendar.sources) as Array<[CalendarSourceKey, CalendarLoadResult["sources"][CalendarSourceKey]]>
  ).flatMap(([sourceKey, source]) =>
    source.state === "unavailable" ? [{ sourceKey, source: source as UnavailableCalendarSource }] : [],
  );

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
      setSuccessMessage(editingId ? "Připomínka byla upravena." : "Připomínka byla uložena.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Připomínku se nepodařilo uložit.");
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
      setErrorMessage(error instanceof Error ? error.message : "Akci se nepodařilo provést.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upozornění na splatné připomínky */}
      {dueReminders.length > 0 && (
        <StatusAlert tone="warning" role="status">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="text-xs font-semibold">Připomínka je splatná</div>
            <div className="mt-1 text-xs text-amber-200/75">
              {dueReminders.map((entry) => entry.title).join(" · ")}
            </div>
          </div>
        </StatusAlert>
      )}

      {unavailableSources.length > 0 && (
        <StatusAlert tone="warning" role="status">
          {unavailableSources.map(({ sourceKey, source }) => (
            <p key={sourceKey}>
              {SOURCE_LABELS[sourceKey]} unavailable: {source.message}
            </p>
          ))}
        </StatusAlert>
      )}

      {/* Přehledový pruh metrik (Agendy) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className={`rounded-xl border p-4 transition-colors ${
            bucketsSummary.overdueCount > 0
              ? "border-red-900/50 bg-red-950/20 text-red-200"
              : "border-zinc-800 bg-zinc-950/40 text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${bucketsSummary.overdueCount > 0 ? "text-red-400" : "text-zinc-500"}`} />
            <span className="text-xs font-medium">Po termínu</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {bucketsSummary.overdueCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium">Dnes</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {bucketsSummary.todayCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium">Zítra</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {bucketsSummary.tomorrowCount}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-medium">Později</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
            {bucketsSummary.laterCount}
          </div>
        </div>
      </div>

      {/* Ovládací lišta: Filtry a akce */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "scheduled_call", "reminder"] as CalendarFilter[]).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilter(val)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === val
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {val === "all" ? `Vše (${bucketsSummary.totalCount})` : val === "scheduled_call" ? "Jen hovory" : "Jen připomínky"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw className={isLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
          </Button>
          <Button type="button" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Nová připomínka
          </Button>
        </div>
      </div>

      {successMessage && <StatusAlert tone="success" role="status">{successMessage}</StatusAlert>}
      {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}

      {/* Jednotlivé sekce agendy */}
      {visibleEntries.length === 0 ? (
        <Surface variant="empty">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <div className="text-sm font-semibold text-zinc-200">Žádné naplánované hovory ani úkoly</div>
          <p className="mt-1 text-xs text-zinc-500">
            V této kategorii aktuálně nemáte žádné položky.
          </p>
        </Surface>
      ) : (
        <div className="space-y-6">
          {bucketsSummary.buckets.map((bucket) => {
            if (bucket.entries.length === 0) return null;

            return (
              <section key={bucket.key} className="space-y-3" aria-label={bucket.label}>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {bucket.label}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      bucket.key === "overdue"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {bucket.entries.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {bucket.entries.map((entry) => {
                    const status = entryStatus(entry);
                    const isBusy = busyId === entry.id;
                    const relativeTime = formatRelativeTime(entry.starts_at);

                    return (
                      <article
                        key={`${entry.type}-${entry.id}`}
                        className={`group relative rounded-xl border p-4 transition-all ${
                          bucket.key === "overdue"
                            ? "border-red-900/40 bg-zinc-950/80 hover:border-red-800/60"
                            : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700/80"
                        }`}
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 items-start gap-3.5">
                            <div
                              className={`mt-0.5 rounded-lg p-2.5 ${
                                entry.type === "scheduled_call"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {entry.type === "scheduled_call" ? (
                                <PhoneCall className="h-4 w-4" />
                              ) : (
                                <Bell className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-zinc-200">
                                  {bucket.key === "today" ? formatTimeOnly(entry.starts_at) : formatDate(entry.starts_at)}
                                </span>
                                <span className="text-[11px] text-zinc-500">({relativeTime})</span>
                                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                              </div>

                              <div className="mt-1">
                                {entry.lead ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-zinc-100">
                                      {entry.lead.full_name}
                                    </span>
                                    <span className="font-mono text-xs text-zinc-400">
                                      {entry.lead.phone}
                                    </span>
                                  </div>
                                ) : (
                                  <h4 className="text-sm font-medium text-zinc-100">{entry.title}</h4>
                                )}
                              </div>

                              {entry.reminder?.note && (
                                <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                                  {entry.reminder.note}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Akce */}
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 sm:pt-0">
                            {entry.lead && (
                              <>
                                <Link
                                  href={`/console?leadId=${entry.lead.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
                                >
                                  <PhoneCall className="h-3.5 w-3.5" /> Call now
                                </Link>
                                <Link
                                  href={`/leads/${entry.lead.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                                >
                                  <User className="h-3.5 w-3.5" /> Detail
                                </Link>
                              </>
                            )}

                            {entry.type === "reminder" && entry.status === "open" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEdit(entry)}
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Upravit
                                </button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    void runReminderAction(
                                      entry,
                                      () => completeReminderAction(entry.id),
                                      "Připomínka byla dokončena.",
                                    )
                                  }
                                  disabled={isBusy}
                                >
                                  <Check className="h-3.5 w-3.5" /> Hotovo
                                </Button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runReminderAction(
                                      entry,
                                      () => cancelReminderAction(entry.id),
                                      "Připomínka byla zrušena.",
                                    )
                                  }
                                  disabled={isBusy}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" /> Zrušit
                                </button>
                              </>
                            )}

                            {entry.status === "completed" && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Dokončeno</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Dialog pro vytvoření / editaci připomínky */}
      <Dialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        aria-labelledby="reminder-dialog-title"
        size="md"
      >
        <form onSubmit={saveReminder} className="w-full space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="reminder-dialog-title" className="text-base font-semibold text-zinc-100">
                {editingId ? "Upravit připomínku" : "Nová připomínka"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Osobní pracovní úkol operátora.
              </p>
            </div>
            <Button type="button" variant="quiet" onClick={() => setIsEditorOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <FieldLabel htmlFor="reminder-title">Název</FieldLabel>
          <TextField
            id="reminder-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            maxLength={200}
            required
            placeholder="Např. Zavolat dodatečně ohledně adresy"
          />
          <FieldLabel htmlFor="reminder-note">
            Poznámka <span className="text-zinc-500">(nepovinné)</span>
          </FieldLabel>
          <TextAreaField
            id="reminder-note"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            maxLength={2000}
            rows={3}
            placeholder="Podrobnosti, kontext..."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="reminder-due">Termín</FieldLabel>
              <TextField
                id="reminder-due"
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="reminder-remind-at">Upozornit v</FieldLabel>
              <TextField
                id="reminder-remind-at"
                type="datetime-local"
                value={form.remindAt}
                onChange={(event) => setForm((current) => ({ ...current, remindAt: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Check className="h-3.5 w-3.5" />
              {isLoading ? "Ukládání…" : "Uložit připomínku"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
