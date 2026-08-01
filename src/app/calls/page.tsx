"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  Volume2
} from "lucide-react";
import { CallRecord, getCalls } from "@/lib/calls";
import { CallDetailDrawer } from "@/components/calls/CallDetailDrawer";

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  useEffect(() => {
    async function loadCalls() {
      const data = await getCalls();
      setCalls(data);
    }
    loadCalls();
  }, []);

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      c.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedOutcomeFilter === "all") return matchesSearch;
    return matchesSearch && c.outcome === selectedOutcomeFilter;
  });

  const totalCallsCount = calls.length;
  const totalSalesVolume = calls.reduce((acc, c) => acc + c.order_value, 0);
  const avgDuration = totalCallsCount > 0
    ? Math.round(calls.reduce((acc, c) => acc + c.duration_seconds, 0) / totalCallsCount)
    : 0;

  const salesCompletedCount = calls.filter((c) => c.outcome === "order_placed").length;
  const conversionRate = totalCallsCount > 0 ? Math.round((salesCompletedCount / totalCallsCount) * 100) : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const getOutcomeBadge = (outcome: CallRecord["outcome"]) => {
    switch (outcome) {
      case "order_placed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "followup_scheduled":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "objection_handled":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-emerald-400" />
            Call Logs & Speech Transcripts
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time call history logs, AHT benchmarks, and full speech transcript protocols
          </p>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Total Logged Calls</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-zinc-100">{totalCallsCount}</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Avg Handling Time (AHT)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black font-mono text-cyan-400">{formatDuration(avgDuration)}</span>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Call Revenue Volume</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black font-mono text-emerald-400">${totalSalesVolume.toFixed(2)}</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Call Conversion Rate</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{conversionRate}%</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, agent or call ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedOutcomeFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedOutcomeFilter === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              All Logs ({calls.length})
            </button>
            <button
              onClick={() => setSelectedOutcomeFilter("order_placed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedOutcomeFilter === "order_placed"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              Order Placed
            </button>
            <button
              onClick={() => setSelectedOutcomeFilter("followup_scheduled")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedOutcomeFilter === "followup_scheduled"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              Follow-ups
            </button>
          </div>

        </div>
      </div>

      {/* Call Logs Table */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3.5">Call ID & Customer</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Sentiment</th>
                <th className="px-5 py-3.5">Revenue</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredCalls.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-bold text-zinc-100">{c.lead_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">#{c.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-zinc-300">{c.agent_name}</td>
                  <td className="px-5 py-4 font-mono text-cyan-400">{formatDuration(c.duration_seconds)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getOutcomeBadge(c.outcome)}`}>
                      {c.outcome.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-zinc-300">{c.sentiment}</span>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                    ${c.order_value.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedCall(c)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Transcript</span>
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
        isOpen={Boolean(selectedCall)}
        onClose={() => setSelectedCall(null)}
      />

    </div>
  );
}
