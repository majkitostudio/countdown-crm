"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Clock,
  Search,
  Eye,
  FileText,
} from "lucide-react";
import { CallRecord, formatCallOutcome, getCalls } from "@/lib/calls";
import { getCallOutcomeClassName } from "@/lib/callOutcomeStyles";
import { CallDetailDrawer } from "@/components/calls/CallDetailDrawer";
import { PageHeader } from "@/components/layout/PageHeader";

function useReviewQueryFilter() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => (new URLSearchParams(window.location.search).get("review") === "unreviewed" ? "unreviewed" : null),
    () => null,
  );
}

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutcomeFilterState, setSelectedOutcomeFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reviewQueryFilter = useReviewQueryFilter();
  const selectedOutcomeFilter = reviewQueryFilter === "unreviewed" ? "unreviewed" : selectedOutcomeFilterState;

  useEffect(() => {
    async function loadCalls() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getCalls();
        setCalls(data);
      } catch (error) {
        setCalls([]);
        setLoadError(error instanceof Error ? error.message : "Call records could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }
    loadCalls();
  }, []);

  const selectOutcomeFilter = (filter: string) => {
    setSelectedOutcomeFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter === "unreviewed") {
      params.set("review", "unreviewed");
    } else {
      params.delete("review");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/calls?${query}` : "/calls");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      c.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedOutcomeFilter === "all") return matchesSearch;
    if (selectedOutcomeFilter === "unreviewed") {
      return matchesSearch && c.review_status === "not_reviewed";
    }
    return matchesSearch && c.outcome === selectedOutcomeFilter;
  });

  const canReview = calls.some((call) => call.review_href !== null);
  const unreviewedCount = calls.filter((call) => call.review_status === "not_reviewed").length;

  const reviewHrefForCall = (call: CallRecord) => {
    if (!call.review_href || selectedOutcomeFilter !== "unreviewed") return call.review_href;
    return `${call.review_href}?return=unreviewed`;
  };

  const reviewStatusLabel = (status: CallRecord["review_status"]) => {
    if (status === "not_reviewed") return "Not reviewed";
    if (status === "corrected") return "Corrected";
    if (status === "reviewed") return "Reviewed";
    return null;
  };

  const totalCallsCount = calls.length;
  const avgDuration = totalCallsCount > 0
    ? Math.round(calls.reduce((acc, c) => acc + c.duration_seconds, 0) / totalCallsCount)
    : 0;
  const capturedTranscriptCount = calls.filter((call) => call.transcript.kind !== "unavailable").length;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      <PageHeader
        icon={PhoneCall}
        title="Call History"
        badge={{
          label: isLoading ? "Loading records" : loadError ? "Unavailable" : `${totalCallsCount} recorded calls`,
          tone: loadError ? "unavailable" : "neutral",
        }}
        description="Recorded call outcomes and any verified captured transcripts. A record may not include audio or a transcript."
        actions={
          <div className="flex items-center gap-2">
            {canReview && (
              <Link
                href="/calls?review=unreviewed"
                className="inline-flex items-center rounded-xl border border-amber-900/70 bg-amber-950/30 px-4 py-2.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-950/50"
              >
                Needs review: {unreviewedCount}
              </Link>
            )}
            <Link href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Launch Operator Console</span>
            </Link>
          </div>
        }
      />

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-200">
          Call history is unavailable: {loadError} No empty call list is being shown as a result.
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Recorded Calls</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{isLoading || loadError ? "—" : totalCallsCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <PhoneCall className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Average Recorded Duration</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{isLoading || loadError ? "—" : formatDuration(avgDuration)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Captured Transcripts</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{isLoading || loadError ? "—" : `${capturedTranscriptCount} / ${totalCallsCount}`}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, operator or call ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => selectOutcomeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "all"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              All Logs ({calls.length})
            </button>
            <button
              onClick={() => selectOutcomeFilter("order_placed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "order_placed"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Order Placed
            </button>
            <button
              onClick={() => selectOutcomeFilter("followup_scheduled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "followup_scheduled"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Follow-ups
            </button>
            {canReview && (
              <button
                onClick={() => selectOutcomeFilter("unreviewed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selectedOutcomeFilter === "unreviewed"
                    ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
              >
                Unreviewed
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-800/80">
              <tr>
                <th className="px-5 py-3">Call ID & Customer</th>
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3">Recorded Sentiment</th>
                <th className="px-5 py-3">Transcript</th>
                {canReview && <th className="px-5 py-3">Review</th>}
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={canReview ? 8 : 7} className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-zinc-200">
                      {loadError
                        ? "Call history could not be loaded."
                        : isLoading
                          ? "Loading call history…"
                          : selectedOutcomeFilter === "unreviewed"
                        ? "All available calls are reviewed."
                        : "No calls match the selected filters."}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {loadError
                        ? "The connection or workspace data needs attention before this list can be shown."
                        : isLoading
                          ? "No call count or empty state is inferred while records are loading."
                          : selectedOutcomeFilter === "unreviewed"
                        ? "There is no remaining Team Leader coaching action in this list."
                        : "Try a different outcome or search term."}
                    </p>
                  </td>
                </tr>
              ) : filteredCalls.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{c.lead_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">#{c.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-300">{c.agent_name}</td>
                  <td className="px-5 py-3 font-mono text-zinc-300">{formatDuration(c.duration_seconds)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getCallOutcomeClassName(c.outcome)}`}>
                      {formatCallOutcome(c.outcome)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-zinc-300 font-mono">{c.sentiment}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${
                      c.transcript.kind === "unavailable"
                        ? "border-zinc-800 bg-zinc-950 text-zinc-500"
                        : "border-emerald-900/70 bg-emerald-950/30 text-emerald-200"
                    }`}>
                      {c.transcript.kind === "unavailable" ? "Not captured" : "Captured"}
                    </span>
                  </td>
                  {canReview && (
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${
                          c.review_status === "not_reviewed"
                            ? "border-amber-900/70 bg-amber-950/30 text-amber-200"
                            : c.review_status === "corrected"
                              ? "border-sky-900/70 bg-sky-950/30 text-sky-200"
                              : "border-emerald-900/70 bg-emerald-950/30 text-emerald-200"
                        }`}>
                          {reviewStatusLabel(c.review_status)}
                        </span>
                        {c.review_href && (
                          <Link
                            href={reviewHrefForCall(c) || "#"}
                            className="text-[11px] font-medium text-sky-300 hover:text-sky-200"
                          >
                            Open review
                          </Link>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedCall(c)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      <span>View record</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Detail Drawer */}
      <CallDetailDrawer
        call={selectedCall}
        reviewHref={selectedCall ? reviewHrefForCall(selectedCall) : null}
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />

    </div>
  );
}
