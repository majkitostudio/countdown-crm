"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState, useTransition } from "react";
import { Clock3, FileText, History, PhoneCall, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { recordCallReviewAction } from "@/app/actions/callReviews";
import type {
  CallReviewDTO,
  CallReviewRevisionDTO,
} from "@/lib/dal/callReviews";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

function humanize(value: string | null): string {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Surface variant="page">
    <section className="p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <span className="text-zinc-500" aria-hidden="true">{icon}</span>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      {children}
    </section>
    </Surface>
  );
}

function TranscriptEvidence({ review }: { review: CallReviewDTO }) {
  const transcript = review.transcript;
  if (transcript.kind === "unavailable") {
    return (
      <StatusAlert tone="warning">
        <p className="text-xs font-semibold text-amber-200">Transcript unavailable</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/70">No verified transcript was captured. The CRM has not reconstructed or invented one.</p>
      </StatusAlert>
    );
  }

  if (transcript.kind === "plain_text") {
    return (
      <Surface variant="inset"><div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Legacy unstructured transcript</p>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-zinc-300">{transcript.text}</p>
      </div></Surface>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Structured transcript</p>
      {transcript.entries.map((entry, index) => (
        <Surface key={`${entry.timestamp}-${index}`} variant="inset" className="w-full">
        <article
          className={`p-3 text-xs ${entry.speaker === "operator" ? "ml-6" : "mr-6"}`}
        >
          <div className="mb-1 flex justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <span>{entry.speaker === "operator" ? review.operator?.name || "Operator name not recorded" : review.customer?.name || "Customer name not recorded"}</span>
            <time>{entry.timestamp}</time>
          </div>
          <p className="leading-5 text-zinc-300">{entry.text}</p>
        </article>
        </Surface>
      ))}
    </div>
  );
}

function ScriptEvidence({ review }: { review: CallReviewDTO }) {
  const script = review.script;
  if (script.kind === "not_recorded") {
    return (
      <StatusAlert tone="warning">
        <p className="text-xs font-semibold text-amber-200">Script version was not recorded for this call</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/70">This is an older or unlinked call. The CRM will not guess which script was used.</p>
      </StatusAlert>
    );
  }

  if (script.kind === "unavailable") {
    return (
      <StatusAlert tone="warning">
        <p className="text-xs font-semibold text-amber-200">No script was available when this call started</p>
        <p className="mt-1 text-xs text-amber-200/70">This unavailable state was captured at {formatDate(script.capturedAt)}.</p>
      </StatusAlert>
    );
  }

  const label = script.kind === "published_version"
    ? `Published version ${script.versionNumber} captured for this call`
    : "Built-in fallback captured for this call";
  return (
    <div className="space-y-3">
      <StatusAlert tone="success" role="status">
        <p className="text-xs font-semibold text-emerald-200">{label}</p>
        <p className="mt-1 text-[11px] text-emerald-200/60">{script.productTitle} · captured {formatDate(script.capturedAt)}</p>
      </StatusAlert>
      <Surface variant="inset"><div
        className="p-5 text-sm leading-7 text-zinc-300 [&_p]:mb-3 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: script.html }}
      /></Surface>
    </div>
  );
}

interface CallReviewFormProps {
  callId: string;
  latestRevision: CallReviewRevisionDTO | null;
  isCorrectionMode: boolean;
  onCancel: () => void;
  onSaved?: () => void;
}

export function CallReviewForm({
  callId,
  latestRevision,
  isCorrectionMode,
  onCancel,
  onSaved,
}: CallReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [verdict, setVerdict] = useState(isCorrectionMode ? latestRevision?.verdict || "" : "");
  const [coachingNote, setCoachingNote] = useState(isCorrectionMode ? latestRevision?.coachingNote || "" : "");
  const [correctionReason, setCorrectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const expectedRevision = latestRevision?.revisionNumber || 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        await recordCallReviewAction({
          callId,
          expectedRevision,
          verdict,
          coachingNote,
          correctionReason: isCorrectionMode ? correctionReason : null,
        });
        setSuccessMessage(isCorrectionMode ? "Correction saved as a new revision." : "Human review saved.");
        onSaved?.();
        router.refresh();
      } catch (error) {
        const isConflict = Boolean(
          error
          && typeof error === "object"
          && "code" in error
          && error.code === "CONFLICT",
        ) || (error instanceof Error && error.message.includes("Review has changed"));
        setErrorMessage(
          isConflict
            ? "Another manager changed this review. Your text is preserved; reload the page before trying again."
            : error instanceof Error
              ? error.message
              : "The review could not be saved.",
        );
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Surface variant="inset"><p className="px-3 py-2 text-xs text-zinc-300">
        Human decision only. AI has not issued this verdict.
      </p></Surface>
      <label className="block text-xs font-medium text-zinc-400">
        Verdict
        <input
          name="verdict"
          value={verdict}
          onChange={(event) => setVerdict(event.target.value)}
          required
          maxLength={200}
          disabled={isPending}
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-60"
          placeholder="Write the Team Leader's decision"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-400">
        Coaching note
        <textarea
          name="coachingNote"
          value={coachingNote}
          onChange={(event) => setCoachingNote(event.target.value)}
          required
          minLength={3}
          maxLength={4000}
          rows={5}
          disabled={isPending}
          className="mt-2 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm leading-6 text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-60"
          placeholder="Record specific, human-authored coaching"
        />
      </label>
      {isCorrectionMode && (
        <label className="block text-xs font-medium text-zinc-400">
          Reason for correction
          <textarea
            name="correctionReason"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            value={correctionReason}
            onChange={(event) => setCorrectionReason(event.target.value)}
            disabled={isPending}
            className="mt-2 w-full resize-y rounded-xl border border-amber-900/60 bg-zinc-950 px-3 py-2.5 text-sm leading-6 text-zinc-100 outline-none focus:border-amber-700 disabled:opacity-60"
            placeholder="Explain why the previous completed review is being corrected"
          />
        </label>
      )}
      {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
      {successMessage && <StatusAlert tone="success" role="status" aria-live="polite">{successMessage}</StatusAlert>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Saving…"
            : isCorrectionMode
              ? `Save correction as revision ${expectedRevision + 1}`
              : "Complete human review"}
        </Button>
        {isCorrectionMode && (
          <Button type="button" onClick={onCancel} disabled={isPending} variant="secondary">
            Cancel correction
          </Button>
        )}
      </div>
    </form>
  );
}

export function CallReviewWorkspace({ initialReview }: { initialReview: CallReviewDTO }) {
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const latestRevision = initialReview.revisions.at(-1) || null;
  const callSourceLabel = initialReview.callSource === "not_recorded"
    ? "Call source was not recorded"
    : initialReview.callSource === "local_sip"
      ? "Local SIP"
      : initialReview.callSource === "telnyx"
        ? "Telnyx"
        : "Simulation";

  return (
    <main className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Call facts" icon={<PhoneCall className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-4 text-xs">
            <div><dt className="text-zinc-500">Started</dt><dd className="mt-1 text-zinc-200">{formatDate(initialReview.call.createdAt)}</dd></div>
            <div><dt className="text-zinc-500">Duration</dt><dd className="mt-1 font-mono text-zinc-200">{formatDuration(initialReview.call.durationSeconds)}</dd></div>
            <div><dt className="text-zinc-500">Customer</dt><dd className="mt-1 text-zinc-200">{initialReview.customer?.name || "Name not recorded"}</dd></div>
            <div><dt className="text-zinc-500">Operator</dt><dd className="mt-1 text-zinc-200">{initialReview.operator?.name || "Name not recorded"}</dd></div>
            <div className="col-span-2"><dt className="text-zinc-500">Source</dt><dd className="mt-1 text-zinc-200">{callSourceLabel}</dd></div>
          </dl>
        </Section>

        <Section title="Outcome and operator note" icon={<UserRound className="h-4 w-4" />}>
          <dl className="space-y-3 text-xs">
            <div><dt className="text-zinc-500">Outcome</dt><dd className="mt-1 text-zinc-200">{humanize(initialReview.call.outcome)}</dd></div>
            <div><dt className="text-zinc-500">Fail reason</dt><dd className="mt-1 text-zinc-200">{humanize(initialReview.call.failReason)}</dd></div>
            <div><dt className="text-zinc-500">Operator note</dt><dd className="mt-1 whitespace-pre-wrap leading-5 text-zinc-200">{initialReview.call.operatorNote || "No operator note was recorded."}</dd></div>
            {initialReview.call.callbackScheduledAt && <div><dt className="text-zinc-500">Callback</dt><dd className="mt-1 text-zinc-200">{formatDate(initialReview.call.callbackScheduledAt)}</dd></div>}
          </dl>
        </Section>
      </div>

      <Section title="Transcript" icon={<FileText className="h-4 w-4" />}><TranscriptEvidence review={initialReview} /></Section>
      <Section title="Script evidence" icon={<ShieldCheck className="h-4 w-4" />}><ScriptEvidence review={initialReview} /></Section>

      <Section title="Current human review" icon={<RefreshCw className="h-4 w-4" />}>
        {!latestRevision || isCorrectionMode ? (
          <CallReviewForm
            key={`${latestRevision?.id || "new"}-${isCorrectionMode ? "correct" : "create"}`}
            callId={initialReview.call.id}
            latestRevision={latestRevision}
            isCorrectionMode={isCorrectionMode}
            onCancel={() => setIsCorrectionMode(false)}
            onSaved={() => setIsCorrectionMode(false)}
          />
        ) : (
          <div className="space-y-3">
            <Surface variant="inset"><div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Latest verdict · revision {latestRevision.revisionNumber}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{latestRevision.verdict}</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{latestRevision.coachingNote}</p>
            </div></Surface>
            <Button type="button" onClick={() => setIsCorrectionMode(true)} variant="secondary">
              Correct completed review
            </Button>
          </div>
        )}
      </Section>

      <Section title="Revision timeline" icon={<History className="h-4 w-4" />}>
        {initialReview.revisions.length === 0 ? (
          <p className="text-xs text-zinc-500">No completed review exists yet.</p>
        ) : (
          <ol className="space-y-4">
            {initialReview.revisions.map((revision) => (
              <Surface key={revision.id} variant="inset" className="w-full"><li className="relative p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-200">Revision {revision.revisionNumber}</p>
                  <p className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500"><Clock3 className="h-3 w-3" />{formatDate(revision.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{revision.verdict}</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-300">{revision.coachingNote}</p>
                {revision.correctionReason && <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/80"><strong>Correction reason:</strong> {revision.correctionReason}</p>}
                <p className="mt-3 text-[10px] text-zinc-500">Reviewed by {revision.reviewer.name || "name not recorded"}</p>
              </li></Surface>
            ))}
          </ol>
        )}
      </Section>
    </main>
  );
}
