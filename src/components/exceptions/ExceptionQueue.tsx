"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  listTeamLeaderExceptionsAction,
  resolveExceptionAction,
  snoozeExceptionAction,
} from "@/app/actions/exceptionQueue";
import type { ExceptionQueueDTO, ExceptionQueueItemDTO } from "@/lib/dal/exceptionQueue";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type QueueView = "open" | "handled";
type EditorMode = "resolve" | "snooze";
type ExceptionHistoryItem = ExceptionQueueDTO["history"][number];

function isHistoryItem(item: ExceptionQueueItemDTO | ExceptionHistoryItem): item is ExceptionHistoryItem {
  return "status" in item && (item.status === "resolved" || item.status === "snoozed");
}

const TYPE_LABELS = {
  outcome_recovery: "Outcome recovery",
  overdue_callback: "Overdue callback",
  expired_lease: "Expired assignment",
  workflow_failure: "Workflow failure",
  missing_script: "Missing product script",
} as const;

const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
} as const;

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExceptionQueue({ initialData }: { initialData: ExceptionQueueDTO }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<QueueView>("open");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const [editor, setEditor] = useState<{ id: string; mode: EditorMode } | null>(null);
  const [reason, setReason] = useState("");
  const [snoozeHours, setSnoozeHours] = useState("1");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const displayedItems = useMemo(() => {
    const source = view === "open" ? data.items : data.history;
    return source.filter((item) => (
      (priority === "all" || item.priority === priority)
      && (type === "all" || item.type === type)
    ));
  }, [data, priority, type, view]);

  const sourceWarnings = Object.values(data.sources).filter(
    (source): source is { state: "unavailable"; message: string } => source.state === "unavailable" && Boolean(source.message),
  );

  const refresh = async () => {
    setBusy("refresh");
    setMessage(null);
    try {
      setData(await listTeamLeaderExceptionsAction());
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Exception Queue could not be refreshed." });
    } finally {
      setBusy(null);
    }
  };

  const openEditor = (id: string, mode: EditorMode) => {
    setEditor({ id, mode });
    setReason("");
    setSnoozeHours("1");
    setMessage(null);
  };

  const submitEditor = async () => {
    if (!editor) return;
    if (reason.trim().length < 3) {
      setMessage({ tone: "error", text: "Add a short reason with at least 3 characters." });
      return;
    }

    setBusy(editor.id);
    setMessage(null);
    try {
      if (editor.mode === "resolve") {
        await resolveExceptionAction(editor.id, reason);
        setMessage({ tone: "success", text: "Exception marked as handled." });
      } else {
        const until = new Date(Date.now() + Number(snoozeHours) * 60 * 60 * 1000).toISOString();
        await snoozeExceptionAction(editor.id, until, reason);
        setMessage({ tone: "success", text: "Exception snoozed." });
      }
      setData(await listTeamLeaderExceptionsAction());
      setEditor(null);
      setReason("");
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Exception action could not be completed." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-5" data-testid="exception-queue">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Open exceptions" value={data.items.length} icon={ShieldAlert} />
        <SummaryCard label="Critical" value={data.items.filter((item) => item.priority === "critical").length} icon={AlertTriangle} />
        <SummaryCard label="Handled / snoozed" value={data.history.length} icon={CheckCircle2} />
      </div>

      {sourceWarnings.length > 0 && (
        <StatusAlert tone="warning" role="status">
          <p className="font-medium">Exception Queue is only partially available.</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-200/80">
            {sourceWarnings.map((warning) => <li key={warning.message}>{warning.message}</li>)}
          </ul>
        </StatusAlert>
      )}

      {message && (
        <StatusAlert
          tone={message.tone === "success" ? "success" : "danger"}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </StatusAlert>
      )}

      <Surface variant="table">
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-zinc-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-100">Exception Queue</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Only problems proven by current workspace data appear here.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={view}
              onChange={(event) => setView(event.target.value as QueueView)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
              aria-label="Exception status"
            >
              <option value="open">Open ({data.items.length})</option>
              <option value="handled">Handled / snoozed ({data.history.length})</option>
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
              aria-label="Exception priority"
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
              aria-label="Exception type"
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button variant="secondary"
              type="button"
              onClick={() => void refresh()}
              disabled={busy !== null}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/70" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-200">Nothing needs attention in this view.</p>
            <p className="mt-1 text-xs text-zinc-500">No placeholder exception was created.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/70">
            {displayedItems.map((item) => {
              const historical = isHistoryItem(item);
              const isEditing = editor?.id === item.id;
              return (
                <article key={item.id} className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={item.priority === "critical" ? "danger" : item.priority === "high" ? "warning" : "neutral"}>
                          {PRIORITY_LABELS[item.priority]}
                        </StatusBadge>
                        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] text-zinc-300">
                          {TYPE_LABELS[item.type]}
                        </span>
                        {historical && (
                          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] capitalize text-zinc-400">
                            {item.status}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">{item.target.label}</h3>
                        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">{item.reason}</p>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />Owner: {item.owner?.name || "Workspace manager"}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Detected: {formatDate(item.occurred_at)}</span>
                        {item.due_at && <span>Due: {formatDate(item.due_at)}</span>}
                      </div>

                      {historical && (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-300">Manager note:</span> {item.resolution}
                          {item.snoozed_until && <span className="ml-2">Until {formatDate(item.snoozed_until)}</span>}
                        </div>
                      )}
                      {item.callReview?.kind === "not_recorded" && (
                        <p className="text-[11px] text-zinc-600">Exact call was not recorded for this exception</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.callReview?.kind === "linked" && (
                        <Link href={item.callReview.href} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-900/70 bg-sky-950/20 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-950/40">
                          Open call review<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                      <Link href={item.next_action.href} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-white">
                        {item.next_action.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      {!historical && (
                        <>
                          <Button variant="secondary" onClick={() => openEditor(item.id, "resolve")}>Mark handled</Button>
                          <Button variant="secondary" onClick={() => openEditor(item.id, "snooze")}>Snooze</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <label className="block text-xs font-medium text-zinc-300" htmlFor={`exception-reason-${item.id}`}>
                        {editor.mode === "resolve" ? "What was done?" : "Why should this wait?"}
                      </label>
                      <textarea
                        id={`exception-reason-${item.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {editor.mode === "snooze" && (
                          <select value={snoozeHours} onChange={(event) => setSnoozeHours(event.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300" aria-label="Snooze duration">
                            <option value="1">1 hour</option>
                            <option value="4">4 hours</option>
                            <option value="24">1 day</option>
                            <option value="168">1 week</option>
                          </select>
                        )}
                        <button type="button" onClick={() => setEditor(null)} disabled={busy === item.id} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 disabled:opacity-50">Cancel</button>
                        <button type="button" onClick={() => void submitEditor()} disabled={busy === item.id} className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 disabled:opacity-50">
                          {busy === item.id ? "Saving…" : editor.mode === "resolve" ? "Confirm handled" : "Confirm snooze"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Surface>
    </section>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof ShieldAlert }) {
  return (
    <MetricCard label={<span className="inline-flex items-center gap-2">{label}<Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>} value={value} />
  );
}
