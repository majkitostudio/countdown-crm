"use client";

import React, { useEffect, useState } from "react";
import { FileText, Send } from "lucide-react";
import { createLeadNoteAction } from "@/app/actions/leadNotes";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";

interface LeadNotesCardProps {
  leadId: string;
  notes: LeadNoteDTO[];
  onNotesChange: (notes: LeadNoteDTO[]) => void;
}

type DraftStatus = "empty" | "unsaved" | "draft_saved" | "restored" | "server_saved";

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("cs-CZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function LeadNotesCard({ leadId, notes, onNotesChange }: LeadNotesCardProps) {
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("empty");
  const [hydratedLeadId, setHydratedLeadId] = useState<string | null>(null);
  const draftStorageKey = `countdown-crm:lead-note-draft:${leadId}`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let savedDraft = "";
      try {
        savedDraft = window.localStorage.getItem(draftStorageKey) || "";
      } catch {
        savedDraft = "";
      }

      setBody(savedDraft);
      setDraftStatus(savedDraft ? "restored" : "empty");
      setHydratedLeadId(leadId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [draftStorageKey, leadId]);

  useEffect(() => {
    if (hydratedLeadId !== leadId) return;

    if (!body.trim()) {
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // The server save path remains available if local draft storage is blocked.
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftStorageKey, body);
        setDraftStatus("draft_saved");
      } catch {
        setDraftStatus("unsaved");
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [body, draftStorageKey, hydratedLeadId, leadId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedBody = body.trim();
    if (!normalizedBody || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const note = await createLeadNoteAction(leadId, normalizedBody);
      onNotesChange([note, ...notes]);
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // The note has already been persisted on the server.
      }
      setBody("");
      setDraftStatus("server_saved");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lead note could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNoteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const draftStatusLabel = isSaving
    ? "Saving note..."
    : draftStatus === "unsaved"
      ? "Unsaved changes"
      : draftStatus === "draft_saved"
        ? "Draft saved locally"
        : draftStatus === "restored"
          ? "Draft restored"
          : draftStatus === "server_saved"
            ? "Note saved"
            : "No draft";

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Lead Notes</h2>
          <p className="text-[11px] text-zinc-500">Shared consultation notes for this lead</p>
        </div>
        <kbd className="ml-auto rounded border border-zinc-800 bg-zinc-950/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500" title="Focus note field">N</kbd>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <label htmlFor="lead-note-input" className="sr-only">Add lead note</label>
        <textarea
          id="lead-note-input"
          rows={3}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setDraftStatus(event.target.value.trim() ? "unsaved" : "empty");
          }}
          onKeyDown={handleNoteKeyDown}
          placeholder="Add a note from the consultation..."
          maxLength={2000}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[10px] text-zinc-600">
            <span className="block">Visible to operators assigned to this lead</span>
            <span role="status" aria-live="polite" className="text-zinc-500">{draftStatusLabel} · Ctrl/Cmd + Enter to save</span>
          </div>
          <button
            type="submit"
            disabled={isSaving || !body.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-3 w-3" aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div role="alert" className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/30 p-2.5 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Note history</h3>
          <span className="font-mono text-[10px] text-zinc-600">{notes.length}</span>
        </div>
        {notes.length === 0 ? (
          <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 text-xs text-zinc-500">
            No notes for this lead yet.
          </p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
              <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-500">
                <span className="font-medium text-zinc-300">{note.author_name}</span>
                <time dateTime={note.created_at}>{formatTimestamp(note.created_at)}</time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{note.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
