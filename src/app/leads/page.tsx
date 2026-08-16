"use client";

import React, { useState, useEffect } from "react";
import { Users, Sparkles, UserCheck, DollarSign, UserPlus, RefreshCw } from "lucide-react";
import { listLeadsAction } from "@/app/actions/crm";
import { Lead } from "@/lib/leads";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { CsvImportModal } from "@/components/leads/CsvImportModal";
import { CreateLeadModal } from "@/components/leads/CreateLeadModal";
import { ViewSwitcher, ViewMode } from "@/components/views/ViewSwitcher";
import { KanbanBoard } from "@/components/views/KanbanBoard";
import { FilterEngineBar, ActiveFilter } from "@/components/views/FilterEngineBar";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const loadLeads = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listLeadsAction();
      setLeads(data);
    } catch (error) {
      setLeads([]);
      setLoadError(error instanceof Error ? error.message : "Leady se nepodařilo načíst.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadInitialLeads() {
      await loadLeads();
    }

    void loadInitialLeads();
  }, []);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleStartCall = (lead: Lead) => {
    alert(`Initiating virtual call with ${lead.full_name} (${lead.phone})... Redirecting to Agent Workspace.`);
  };

  const handleImportComplete = (count: number) => {
    loadLeads();
  };

  // Filter leads based on ActiveFilters
  const filteredLeads = leads.filter((lead) => {
    if (activeFilters.length === 0) return true;

    return activeFilters.every((filter) => {
      const val = (lead as unknown as Record<string, unknown>)[filter.fieldKey] ?? "";
      const valStr = String(val).toLowerCase();
      const filterValStr = filter.value.toLowerCase();

      switch (filter.operator) {
        case "equals":
          return valStr === filterValStr;
        case "not_equals":
          return valStr !== filterValStr;
        case "contains":
          return valStr.includes(filterValStr);
        case "greater_than":
          return parseFloat(String(val)) > parseFloat(filter.value);
        case "less_than":
          return parseFloat(String(val)) < parseFloat(filter.value);
        default:
          return true;
      }
    });
  });

  // Metrics (computed from filteredLeads)
  const totalLeads = filteredLeads.length;
  const qualifiedLeads = filteredLeads.filter((l) => l.status === "qualified" || l.status === "customer").length;
  const qualifiedRatio = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const avgScore = totalLeads > 0 ? Math.round(filteredLeads.reduce((acc, l) => acc + l.ai_score, 0) / totalLeads) : 0;
  const totalPipelineValue = filteredLeads.reduce((acc, l) => acc + (l.value || 750), 0);

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      {/* Page Title & Main Header Hero Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <Users className="w-5 h-5 text-zinc-400" />
              Leads & Contacts
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              {totalLeads} Total Leads
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Manage prospective customers, view AI propensity scoring, and import campaign leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher (Table / Kanban) */}
          <ViewSwitcher mode={viewMode} onModeChange={setViewMode} />

          <button
            onClick={loadLeads}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            title="Refresh Leads Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Lead</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-xs hover:border-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Import CSV Database</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs text-rose-300">
          {loadError}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Leads Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Total Contacts</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">{totalLeads}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Qualified Leads Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Qualified Rate</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">{qualifiedRatio}%</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Avg AI Propensity Score */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Avg. AI Score</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">{avgScore}/100</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Total Pipeline Value */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Pipeline Value</span>
            <span className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">${totalPipelineValue.toLocaleString()}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Advanced Filter Engine & Saved Views Bar */}
      <FilterEngineBar onFiltersChange={setActiveFilters} />

      {/* Main Content View (Table vs. Kanban Board) */}
      {viewMode === "table" ? (
        <LeadsTable
          leads={filteredLeads}
          onSelectLead={handleSelectLead}
          onStartCall={handleStartCall}
          onOpenImportModal={() => setIsImportModalOpen(true)}
        />
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          onSelectLead={handleSelectLead}
          onStartCall={handleStartCall}
          onLeadUpdated={loadLeads}
        />
      )}

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

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadLeads}
      />

    </div>
  );
}
