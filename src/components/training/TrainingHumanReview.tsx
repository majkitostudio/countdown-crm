"use client";

import { useState, useTransition } from "react";
import { recordTrainingReviewAction } from "@/app/actions/trainingReviews";

type Revision = { revision_number: number; verdict: string; coaching_note: string; correction_reason: string | null; reviewer_name: string; created_at: string };

export function TrainingHumanReview({ sessionId, revisions }: { sessionId: string; revisions: Revision[] }) {
  const latest = revisions.at(-1);
  const [editing, setEditing] = useState(!latest);
  const [verdict, setVerdict] = useState(latest?.verdict || "");
  const [note, setNote] = useState(latest?.coaching_note || "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function submit() {
    startTransition(async () => {
      try {
        await recordTrainingReviewAction({ sessionId, expectedRevision: latest?.revision_number || 0, verdict, coachingNote: note, correctionReason: latest ? reason : null });
        setMessage("Lidské hodnocení bylo uloženo jako nová revize.");
        setEditing(false);
      } catch (error) { setMessage(error instanceof Error ? error.message : "Hodnocení se nepodařilo uložit."); }
    });
  }
  return <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"><h2 className="text-sm font-semibold text-zinc-100">Lidské hodnocení vedoucího</h2><p className="mt-1 text-xs text-zinc-500">Automatický compliance nález není lidský verdikt.</p>{latest && !editing ? <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-sm font-semibold text-zinc-100">{latest.verdict}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{latest.coaching_note}</p><p className="mt-3 text-[11px] text-zinc-500">Revize {latest.revision_number} · {latest.reviewer_name}</p><button type="button" onClick={() => setEditing(true)} className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200">Opravit hodnocení</button></div> : <div className="mt-4 space-y-3"><input value={verdict} onChange={(event) => setVerdict(event.target.value)} maxLength={200} placeholder="Verdikt vedoucího" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"/><textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={4000} placeholder="Konkrétní koučovací poznámka" className="min-h-28 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100"/>{latest && <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} placeholder="Proč předchozí hodnocení opravujete" className="min-h-20 w-full rounded-lg border border-amber-900/60 bg-zinc-950 p-3 text-sm text-zinc-100"/>}<button type="button" disabled={pending || !verdict.trim() || note.trim().length < 3 || Boolean(latest && reason.trim().length < 3)} onClick={submit} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50">{pending ? "Ukládám…" : latest ? "Uložit opravu" : "Uložit lidské hodnocení"}</button></div>}{message && <p className="mt-3 text-xs text-zinc-400">{message}</p>}{revisions.length > 0 && <ol className="mt-5 space-y-2 border-t border-zinc-800 pt-4">{revisions.map((revision) => <li key={`${revision.revision_number}-${revision.created_at}`} className="text-xs text-zinc-400">Revize {revision.revision_number}: <span className="text-zinc-200">{revision.verdict}</span> · {revision.reviewer_name}</li>)}</ol>}</section>;
}
