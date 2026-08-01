"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Sparkles,
  Phone,
  Eye,
  Trash2,
  Building,
  MapPin,
  ArrowUpDown,
  MoreVertical,
  UserPlus
} from "lucide-react";
import { Lead } from "@/lib/leads";

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  onOpenImportModal: () => void;
}

export function LeadsTable({
  leads,
  onSelectLead,
  onStartCall,
  onDeleteLead,
  onOpenImportModal,
}: LeadsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "score" | "name">("score");

  // Filter & Sort Logic
  const filteredLeads = leads
    .filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        lead.full_name.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.city && lead.city.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "score") return b.ai_score - a.ai_score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getScoreBadge = (score: number) => {
    let color = "bg-zinc-800 text-zinc-300 border-zinc-700";
    if (score >= 85) color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    else if (score >= 70) color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    else if (score < 40) color = "bg-rose-500/10 text-rose-400 border-rose-500/20";

    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
        <Sparkles className="w-3 h-3" />
        <span>{score}/100</span>
      </div>
    );
  };

  const getStatusBadge = (status: Lead["status"]) => {
    const config: Record<Lead["status"], { label: string; style: string }> = {
      new: { label: "New Lead", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      contacted: { label: "Contacted", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      qualified: { label: "Qualified", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      customer: { label: "Customer", style: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
      unresponsive: { label: "Unresponsive", style: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    };

    const current = config[status] || config.new;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${current.style}`}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      
      {/* Controls Bar: Search, Filters & Import Button */}
      <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/90">
        
        {/* Left Side: Search + Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search leads, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            {["all", "new", "contacted", "qualified", "customer"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === st
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Sorting & Actions */}
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "score" | "name")}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="score" className="bg-zinc-900">AI Score (High to Low)</option>
              <option value="newest" className="bg-zinc-900">Newest Created</option>
              <option value="name" className="bg-zinc-900">Name (A-Z)</option>
            </select>
          </div>

          {/* Import CSV CTA */}
          <button
            onClick={onOpenImportModal}
            className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
        </div>

      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/40 uppercase tracking-wider">
              <th className="py-3.5 px-4">Customer / Lead</th>
              <th className="py-3.5 px-4">Contact Info</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">AI Score</th>
              <th className="py-3.5 px-4 text-right">Est. Value</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  No leads found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Lead Name & Avatar */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 group-hover:border-zinc-500 transition-colors">
                        {lead.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 text-sm group-hover:text-emerald-400 transition-colors">
                          {lead.full_name}
                        </div>
                        {lead.company && (
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{lead.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-zinc-200">{lead.phone}</div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                      {lead.email || `${lead.city || "Prague"}, CZ`}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(lead.status)}
                  </td>

                  {/* AI Score */}
                  <td className="py-3.5 px-4">
                    {getScoreBadge(lead.ai_score)}
                  </td>

                  {/* Est Value */}
                  <td className="py-3.5 px-4 text-right font-semibold text-zinc-200 font-mono">
                    ${lead.value || 750}
                  </td>

                  {/* Quick Action Buttons */}
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStartCall(lead)}
                        title="Start Virtual Call"
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        title="View Details"
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400 flex items-center justify-between">
        <span>Showing <strong className="text-zinc-200">{filteredLeads.length}</strong> of <strong className="text-zinc-200">{leads.length}</strong> total leads</span>
        <span className="text-zinc-500 text-[11px]">Powered by AI Propensity Scoring Engine</span>
      </div>

    </div>
  );
}
