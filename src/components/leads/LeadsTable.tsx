"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Phone,
  Eye,
  Building,
  ArrowUpDown,
  UserPlus
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { schemaEngine } from "@/lib/schema/engine";
import { AttributeDefinition } from "@/lib/schema/types";
import { AddCustomFieldModal } from "@/components/schema/AddCustomFieldModal";

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onOpenImportModal: () => void;
}

export function LeadsTable({
  leads,
  onSelectLead,
  onStartCall,
  onOpenImportModal,
}: LeadsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "score" | "name">("score");
  const [isAddCustomFieldOpen, setIsAddCustomFieldOpen] = useState(false);
  const handleAddField = (newAttr: AttributeDefinition) => {
    schemaEngine.addCustomAttribute("leads", newAttr);
  };

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
    let dotColor = "bg-zinc-400";
    if (score >= 85) dotColor = "bg-emerald-500";
    else if (score >= 70) dotColor = "bg-amber-500";
    else if (score < 40) dotColor = "bg-rose-500";

    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{score}/100</span>
      </div>
    );
  };

  const getStatusBadge = (status: Lead["status"]) => {
    const config: Record<Lead["status"], { label: string; dot: string }> = {
      new: { label: "New Lead", dot: "bg-zinc-400" },
      contacted: { label: "Contacted", dot: "bg-amber-500" },
      qualified: { label: "Qualified", dot: "bg-emerald-500" },
      customer: { label: "Customer", dot: "bg-emerald-500" },
      unresponsive: { label: "Unresponsive", dot: "bg-rose-500" },
    };

    const current = config[status] || config.new;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm flex flex-col">
      
      {/* Controls Bar: Search, Filters & Import Button */}
      <div className="p-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 bg-zinc-950/40">
        
        {/* Left Side: Search + Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search leads, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            {["all", "new", "contacted", "qualified", "customer"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
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
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="score" className="bg-zinc-900">AI Score (High to Low)</option>
              <option value="newest" className="bg-zinc-900">Newest Created</option>
              <option value="name" className="bg-zinc-900">Name (A-Z)</option>
            </select>
          </div>

          {/* Add Custom Field CTA (Attio Schema) */}
          <button
            onClick={() => setIsAddCustomFieldOpen(true)}
            className="py-2 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Add dynamic custom attribute to schema"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>+ Custom Field</span>
          </button>

          {/* Import CSV CTA */}
          <button
            onClick={onOpenImportModal}
            className="py-2 px-4 bg-zinc-100 text-zinc-950 font-medium rounded-xl text-xs flex items-center gap-2 hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
        </div>

      </div>

      {/* Modal for adding custom Attio fields */}
      <AddCustomFieldModal
        isOpen={isAddCustomFieldOpen}
        onClose={() => setIsAddCustomFieldOpen(false)}
        onAddField={handleAddField}
      />

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/40 uppercase tracking-wider">
              <th className="py-3 px-4">Customer / Lead</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">AI Score</th>
              <th className="py-3 px-4 text-right">Est. Value</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 shrink-0">
                        {lead.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 text-xs group-hover:text-zinc-200 transition-colors">
                          {lead.full_name}
                        </div>
                        {lead.company && (
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{lead.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="py-3 px-4">
                    <div className="font-mono text-zinc-200">{lead.phone}</div>
                    <div className="text-[11px] text-zinc-400 truncate max-w-[180px]">
                      {lead.email || `${lead.city || "Prague"}, CZ`}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    {getStatusBadge(lead.status)}
                  </td>

                  {/* AI Score */}
                  <td className="py-3 px-4">
                    {getScoreBadge(lead.ai_score)}
                  </td>

                  {/* Est Value */}
                  <td className="py-3 px-4 text-right font-semibold text-zinc-200 font-mono">
                    ${lead.value || 750}
                  </td>

                  {/* Quick Action Buttons */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStartCall(lead)}
                        title="Start Virtual Call"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        title="View Details"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors border border-zinc-800 cursor-pointer"
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
