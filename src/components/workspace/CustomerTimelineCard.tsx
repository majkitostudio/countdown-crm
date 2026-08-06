"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  PhoneCall,
  ShoppingBag,
  Zap,
  FileText,
  RefreshCw,
  Plus,
  Send,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import {
  TimelineActivityEntry,
  TimelineActivityType,
  getLeadTimeline,
  addTimelineEntry
} from "@/lib/timeline";

interface CustomerTimelineCardProps {
  leadId: string;
}

export function CustomerTimelineCard({ leadId }: CustomerTimelineCardProps) {
  const [entries, setEntries] = useState<TimelineActivityEntry[]>([]);
  const [filterType, setFilterType] = useState<TimelineActivityType | "all">("all");
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    setEntries(getLeadTimeline(leadId));
  }, [leadId]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const added = addTimelineEntry(leadId, {
      type: "note",
      title: "Operator Note",
      description: newNoteText.trim(),
      operator_name: "Jan Dvořák",
    });

    setEntries([added, ...entries]);
    setNewNoteText("");
    setIsAddingNote(false);
  };

  const filteredEntries = filterType === "all"
    ? entries
    : entries.filter((e) => e.type === filterType);

  const getEventIcon = (type: TimelineActivityType) => {
    switch (type) {
      case "call":
        return PhoneCall;
      case "order":
        return ShoppingBag;
      case "sms_paylink":
        return Zap;
      case "note":
        return FileText;
      case "status_change":
        return RefreshCw;
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

  return (
    <div className="space-y-3 pt-3 border-t border-zinc-800">
      {/* Header & Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Omnichannel Timeline ({filteredEntries.length})
          </h3>
        </div>

        <button
          onClick={() => setIsAddingNote(!isAddingNote)}
          className="text-[10px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Note</span>
        </button>
      </div>

      {/* Inline Quick Add Note Form */}
      {isAddingNote && (
        <form onSubmit={handleAddNote} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 animate-in fade-in duration-200">
          <textarea
            rows={2}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Type customer activity note..."
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
              className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Save Note</span>
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
            { key: "sms_paylink", label: "SMS" },
            { key: "note", label: "Notes" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
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
        {filteredEntries.length === 0 ? (
          <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl text-center text-zinc-500 text-xs font-mono">
            No entries found for this filter.
          </div>
        ) : (
          filteredEntries.map((item) => {
            const Icon = getEventIcon(item.type);

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
                      {item.title}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 shrink-0 ml-2">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {item.description}
                    </p>
                  )}

                  {/* Metadata Chips */}
                  {item.metadata && (
                    <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                      {item.metadata.order_value !== undefined && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 font-semibold">
                          ${item.metadata.order_value.toFixed(2)}
                        </span>
                      )}

                      {item.metadata.call_duration_seconds !== undefined && (
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                          Duration: {Math.floor(item.metadata.call_duration_seconds / 60)}m {item.metadata.call_duration_seconds % 60}s
                        </span>
                      )}

                      {item.metadata.paylink_url && (
                        <a
                          href={item.metadata.paylink_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 hover:text-zinc-100 flex items-center gap-0.5"
                        >
                          <span>Pay-Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Footer Operator Tag */}
                  <div className="pt-1 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                    <span>by {item.operator_name}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
