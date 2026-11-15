"use client";

import React, { useState } from "react";
import {
  Search,
  Phone,
  Eye,
  Building,
  ArrowUpDown,
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
}

export function LeadsTable({
  leads,
  onSelectLead,
  onStartCall,
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

  const getScoreBadge = (score: number) => <StatusBadge tone="neutral">{score}/100</StatusBadge>;

  const getStatusBadge = (status: Lead["status"]) => {
    const config: Record<Lead["status"], { label: string }> = {
      new: { label: "Nový" },
      contacted: { label: "Kontaktovaný" },
      qualified: { label: "Kvalifikovaný" },
      customer: { label: "Zákazník" },
      unresponsive: { label: "Nereaguje" },
    };

    const current = config[status] || config.new;
    return <StatusBadge tone="neutral">{current.label}</StatusBadge>;
  };

  return (
    <Surface variant="table">

      {/* Controls Bar: Search and filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 p-4">

        {/* Left Side: Search + Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Jméno, telefon nebo město…"
              aria-label="Hledat leady"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-base sm:text-xs text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-700 transition-colors duration-150 ease-interface"
            />
          </div>

          {/* Status Filter Tabs */}
          <Surface variant="inset"><div className="flex items-center gap-1 p-1 text-xs">
            {["all", "new", "contacted", "qualified", "customer"].map((st) => (
              <Button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                variant={statusFilter === st ? "primary" : "quiet"}
                aria-pressed={statusFilter === st}
              >
                {({ all: "Všechny", new: "Nové", contacted: "Kontaktované", qualified: "Kvalifikované", customer: "Zákazníci" } as Record<string, string>)[st]}
              </Button>
            ))}
          </div></Surface>
        </div>

        {/* Right Side: Sorting & Actions */}
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <Surface variant="inset"><div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500">Řazení:</span>
            <select
              aria-label="Řadit leady"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "score" | "name")}
              className="bg-transparent text-zinc-200 cursor-pointer text-xs focus:border-zinc-700"
            >
              <option value="score" className="bg-zinc-900">AI skóre (od nejvyššího)</option>
              <option value="newest" className="bg-zinc-900">Nejnovější</option>
              <option value="name" className="bg-zinc-900">Jméno (A–Z)</option>
            </select>
          </div></Surface>

        </div>

      </div>

      {/* Table Body */}
      <div className="overflow-x-auto" role="region" aria-label="Tabulka leadů" tabIndex={0}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/40 uppercase tracking-wider">
              <th className="py-3 px-4">Zákazník / lead</th>
              <th className="py-3 px-4">Kontaktní údaje</th>
              <th className="py-3 px-4">Stav</th>
              <th className="py-3 px-4">AI skóre</th>
              <th className="py-3 px-4 text-right">Akce</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                  Žádný lead neodpovídá filtrům. Zkuste je změnit.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-zinc-800/40 transition-colors duration-150 ease-interface group cursor-pointer"
                  onClick={() => onSelectLead(lead)}
                >
                  {/* Lead Name & Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 shrink-0">
                        {lead.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 text-xs group-hover:text-zinc-200 transition-colors duration-150 ease-interface">
                          {lead.full_name}
                        </div>
                        {lead.company && (
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
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
                      {lead.email || [lead.city, lead.country].filter(Boolean).join(", ") || "Kontakt není uveden"}
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

                  {/* Quick Action Buttons */}
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStartCall(lead)}
                        title="Zahájit virtuální hovor"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors duration-150 ease-interface cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        title="Zobrazit detail"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors duration-150 ease-interface border border-zinc-800 cursor-pointer"
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
      <div className="flex items-center justify-between border-t border-zinc-800 p-3 text-xs text-zinc-400">
        <span>Zobrazeno <strong className="text-zinc-200">{filteredLeads.length}</strong> z <strong className="text-zinc-200">{leads.length}</strong> leadů</span>
        <span className="text-zinc-400 text-[11px]">Skóre zájmu vyhodnocuje AI</span>
      </div>

    </Surface>
  );
}
