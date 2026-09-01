"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  PhoneCall,
  ShoppingBag,
  FileText,
  Plus,
  Send,
} from "lucide-react";
import { createLeadNoteAction } from "@/app/actions/leadNotes";
import type { CustomerActivityEvent, CustomerActivitySource } from "@/lib/customerActivity";
import { getLeadActivityPage } from "@/lib/timeline";

interface CustomerTimelineCardProps {
  leadId: string;
  refreshToken: number;
  includeNotes?: boolean;
}

export function CustomerTimelineCard({ leadId, refreshToken, includeNotes = true }: CustomerTimelineCardProps) {
  const [entries, setEntries] = useState<CustomerActivityEvent[]>([]);
  const [filterType, setFilterType] = useState<CustomerActivitySource | "all">("all");
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await getLeadActivityPage(leadId, { limit: 50 });
        if (!cancelled) {
          setEntries(res.items);
          setNextCursor(res.next_cursor);
          setHasMore(res.has_more);
        }
      } catch (error) {
        if (!cancelled) {
          setEntries([]);
          setLoadError(error instanceof Error ? error.message : "Timeline could not be loaded");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [leadId, refreshToken]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const res = await getLeadActivityPage(leadId, { cursor: nextCursor, limit: 50 });
      setEntries((current) => {
        const seen = new Set(current.map((entry) => entry.id));
        return [...current, ...res.items.filter((entry) => !seen.has(entry.id))];
      });
      setNextCursor(res.next_cursor);
      setHasMore(res.has_more);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "More timeline entries could not be loaded");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = newNoteText.trim();
    if (!body || isSavingNote) return;

    setIsSavingNote(true);
    setLoadError(null);
    try {
      await createLeadNoteAction(leadId, body);
      const res = await getLeadActivityPage(leadId, { limit: 50 });
      setEntries(res.items);
      setNextCursor(res.next_cursor);
      setHasMore(res.has_more);
      setNewNoteText("");
      setIsAddingNote(false);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Note could not be saved");
    } finally {
      setIsSavingNote(false);
    }
  };

  const timelineEntries = includeNotes ? entries : entries.filter((entry) => entry.source !== "lead_note");
  const filteredEntries = filterType === "all"
    ? timelineEntries
    : timelineEntries.filter((e) => e.source === filterType);

  const getEventIcon = (source: CustomerActivitySource) => {
    switch (source) {
      case "call":
        return PhoneCall;
      case "order":
        return ShoppingBag;
      case "lead_note":
        return FileText;
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("cs-CZ", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-zinc-800">
      {/* Header & Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Lead Timeline ({filteredEntries.length})
          </h3>
        </div>

        {includeNotes && (
          <button
            type="button"
            onClick={() => setIsAddingNote((current) => !current)}
            className="text-[10px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Note</span>
          </button>
        )}
      </div>

      {loadError && (
        <div role="alert" className="p-3 bg-red-950/30 border border-red-900/60 rounded-xl text-xs text-red-300">
          Timeline unavailable: {loadError}
        </div>
      )}

      {includeNotes && isAddingNote && (
        <form onSubmit={handleAddNote} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 animate-in fade-in duration-200">
          <textarea
            rows={2}
            value={newNoteText}
            onChange={(event) => setNewNoteText(event.target.value)}
            placeholder="Type customer activity note..."
            maxLength={2000}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingNote || !newNoteText.trim()}
              className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>{isSavingNote ? "Saving..." : "Save Note"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Category Chips */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono">
        {(
          [
            { key: "all", label: "All" },
            { key: "call", label: "Calls" },
            { key: "order", label: "Orders" },
            ...(includeNotes ? [{ key: "lead_note", label: "Notes" } as const] : []),
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterType(f.key)}
            aria-pressed={filterType === f.key}
            className={`px-2 py-0.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
              filterType === f.key
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vertical Timeline Activity Items */}
      <div className="relative pl-3 space-y-3 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-zinc-800/80">
        {isLoading ? (
          <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs font-mono">
            Loading timeline...
          </div>
        ) : loadError ? null : filteredEntries.length === 0 ? (
          <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs font-mono">
            No entries found for this filter.
          </div>
        ) : (
          filteredEntries.map((item) => {
            const Icon = getEventIcon(item.source);

            return (
              <div key={item.id} className="relative flex items-start gap-3 group">
                {/* Timeline Event Node */}
                <div className="w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 z-10 mt-0.5">
                  <Icon className="w-2.5 h-2.5" />
                </div>

                {/* Event Card Box */}
                <div className="flex-1 bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs line-clamp-1">
                      {item.preview.title}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 shrink-0 ml-2">
                      {formatTimestamp(item.occurred_at)}
                    </span>
                  </div>

                  {item.preview.text && (
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {item.preview.text}
                    </p>
                  )}

                  {/* Metadata Chips */}
                  {item.metadata && (
                    <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                      {item.metadata.amount !== undefined && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 font-semibold">
                          {formatAmount(item.metadata.amount, item.metadata.currency || "USD")}
                        </span>
                      )}

                      {item.metadata.duration_seconds !== undefined && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                          Duration: {Math.floor(item.metadata.duration_seconds / 60)}m {item.metadata.duration_seconds % 60}s
                        </span>
                      )}
                      {item.metadata.order_source && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                          Source: {item.metadata.order_source}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer Operator Tag */}
                  <div className="pt-1 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                    <span>by {item.actor.display_name}</span>
                    <span>{item.channel}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isLoading && !loadError && hasMore && (
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={isLoadingMore}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoadingMore ? "Loading more..." : "Load more activity"}
        </button>
      )}
    </div>
  );
}
