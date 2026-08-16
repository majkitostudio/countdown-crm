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
import { CallRecord, formatCallOutcome, getCalls } from "@/lib/calls";
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
    return "bg-zinc-900 text-zinc-300 border-zinc-800 font-mono";
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Page Title & Actions Hero Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <PhoneCall className="w-5 h-5 text-zinc-400" />
              Call Logs & Speech Transcripts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
              {totalCallsCount} Logged Calls
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time call history logs, AHT benchmarks, and full speech transcript protocols
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/workspace"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Launch Operator Console</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Total Logged Calls</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{totalCallsCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <PhoneCall className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Avg Handling Time (AHT)</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{formatDuration(avgDuration)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Call Revenue Volume</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">${totalSalesVolume.toFixed(2)}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Call Conversion Rate</span>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight font-mono">{conversionRate}%</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <TrendingUp className="w-4 h-4" />
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
              placeholder="Search customer, agent or call ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Outcome Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedOutcomeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "all"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              All Logs ({calls.length})
            </button>
            <button
              onClick={() => setSelectedOutcomeFilter("order_placed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "order_placed"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Order Placed
            </button>
            <button
              onClick={() => setSelectedOutcomeFilter("followup_scheduled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                selectedOutcomeFilter === "followup_scheduled"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700/80 shadow-xs"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              Follow-ups
            </button>
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
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3">Sentiment</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredCalls.map((c) => (
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
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono border ${getOutcomeBadge(c.outcome)}`}>
                      {formatCallOutcome(c.outcome)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-zinc-300 font-mono">{c.sentiment}</span>
                  </td>
                  <td className="px-5 py-3 font-mono font-semibold text-zinc-200">
                    ${c.order_value.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedCall(c)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
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
