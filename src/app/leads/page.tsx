"use client";

import React, { useState, useEffect } from "react";
import { Users, Sparkles, UserCheck, DollarSign, UserPlus, RefreshCw } from "lucide-react";
import { Lead, getLeads } from "@/lib/leads";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { CsvImportModal } from "@/components/leads/CsvImportModal";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadLeads = async () => {
    setIsLoading(true);
    const data = await getLeads();
    setLeads(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleStartCall = (lead: Lead) => {
    // In future phase, redirects to /agent-workspace with prefilled lead
    alert(`Initiating virtual call with ${lead.full_name} (${lead.phone})... Redirecting to Agent Workspace.`);
  };

  const handleImportComplete = (count: number) => {
    loadLeads();
  };

  // Metrics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === "qualified" || l.status === "customer").length;
  const qualifiedRatio = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((acc, l) => acc + l.ai_score, 0) / totalLeads) : 0;
  const totalPipelineValue = leads.reduce((acc, l) => acc + (l.value || 750), 0);

  return (
    <div className="space-y-6">
      
      {/* Page Title & Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            Leads & Contacts
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage prospective customers, view AI propensity scoring, and import campaign leads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
            title="Refresh Leads Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Import CSV Database</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Leads Card */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Total Contacts</span>
            <span className="text-2xl font-extrabold text-zinc-100">{totalLeads}</span>
          </div>
          <div className="p-3 bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Qualified Leads Card */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Qualified Rate</span>
            <span className="text-2xl font-extrabold text-emerald-400">{qualifiedRatio}%</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Avg AI Propensity Score */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Avg. AI Score</span>
            <span className="text-2xl font-extrabold text-amber-400">{avgScore}/100</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">Pipeline Value</span>
            <span className="text-2xl font-extrabold text-zinc-100 font-mono">${totalPipelineValue.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Leads Table Component */}
      <LeadsTable
        leads={leads}
        onSelectLead={handleSelectLead}
        onStartCall={handleStartCall}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {/* Slide-over Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLeadUpdated={loadLeads}
        onStartCall={handleStartCall}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />

    </div>
  );
}
