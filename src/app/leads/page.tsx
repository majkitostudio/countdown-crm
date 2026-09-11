"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, RefreshCw, LockKeyhole } from "lucide-react";
import { listLeadsAction } from "@/app/actions/crm";
import { Lead } from "@/lib/leads";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { CsvImportModal } from "@/components/leads/CsvImportModal";
import { CreateLeadModal } from "@/components/leads/CreateLeadModal";
import { ViewSwitcher, ViewMode } from "@/components/views/ViewSwitcher";
import { KanbanBoard } from "@/components/views/KanbanBoard";
import { FilterEngineBar, ActiveFilter } from "@/components/views/FilterEngineBar";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import { canManageLeads } from "@/lib/auth/roles";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

function LeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalManuallyOpen, setIsCreateModalManuallyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const { identity, isLoading: isIdentityLoading } = useOperatorIdentity();
  const canManageLeadRecords = canManageLeads(identity?.role);
  const shouldOpenCreateModal = searchParams.get("create") === "1";
  const isCreateModalOpen = shouldOpenCreateModal || isCreateModalManuallyOpen;

  useEffect(() => {
    if (!canManageLeadRecords || !shouldOpenCreateModal) return;

    router.replace("/leads", { scroll: false });
  }, [canManageLeadRecords, router, shouldOpenCreateModal]);

  const loadLeads = useCallback(async () => {
    if (!canManageLeadRecords) return;
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
  }, [canManageLeadRecords]);

  useEffect(() => {
    if (isIdentityLoading) return;
    async function loadInitialLeads() {
      await loadLeads();
    }
    void loadInitialLeads();
  }, [isIdentityLoading, loadLeads]);

  if (isIdentityLoading || isLoading && !identity) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-xs text-zinc-400">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        Načítám oprávnění workspace…
      </div>
    );
  }

  if (!canManageLeadRecords) {
    return (
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Lead management unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          Operators do not receive a lead directory or manual lead creation and editing access.
          Assignment will become available after a real inbound or call-queue integration is connected.
        </p>
      </Surface>
    );
  }

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleStartCall = (lead: Lead) => {
    router.push(`/workspace?leadId=${encodeURIComponent(lead.id)}`);
  };

  const handleImportComplete = () => {
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
  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      
      <PageHeader
        icon={Users}
        title="Leads"
        badge={{ label: `${totalLeads} contacts`, tone: "neutral" }}
        description="Review contacts, assignments, and next actions."
        actions={
          <>
          {/* View Switcher (Table / Kanban) */}
          <ViewSwitcher mode={viewMode} onModeChange={setViewMode} />

          <Button
            onClick={loadLeads}
            variant="secondary"
            title="Refresh Leads Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsCreateModalManuallyOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Lead</span>
          </Button>

          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="secondary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Import CSV</span>
          </Button>
          </>
        }
      />

      {loadError && <StatusAlert tone="danger">{loadError}</StatusAlert>}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Contacts" value={totalLeads} />
        <MetricCard label="Qualified" value={`${qualifiedRatio}%`} />
        <MetricCard label="Average score" value={`${avgScore}/100`} />
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
        onClose={() => setIsCreateModalManuallyOpen(false)}
        onCreated={loadLeads}
      />

    </div>
  );
}

function LeadsPageFallback() {
  return (
    <div className="flex min-h-[360px] items-center justify-center text-xs text-zinc-400">
      Načítám lead management…
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsPageFallback />}>
      <LeadsPageContent />
    </Suspense>
  );
}
