"use client";

import React, { useState } from "react";
import { Sparkles, PhoneCall, ChevronRight, ChevronLeft, Layers, Database } from "lucide-react";
import { Lead, updateLead } from "@/lib/leads";
import { blueprintEngine } from "@/lib/blueprints/engine";

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onLeadUpdated: () => void;
}

const STAGES: { id: Lead["status"]; title: string; color: string }[] = [
  { id: "new", title: "New Leads", color: "border-zinc-800 text-zinc-300" },
  { id: "contacted", title: "Contacted", color: "border-zinc-800 text-zinc-300" },
  { id: "qualified", title: "Qualified", color: "border-zinc-800 text-zinc-300" },
  { id: "customer", title: "Won Customer", color: "border-zinc-800 text-zinc-300" },
  { id: "unresponsive", title: "Lost / Unresponsive", color: "border-zinc-800 text-zinc-400" },
];

export function KanbanBoard({
  leads,
  onSelectLead,
  onStartCall,
  onLeadUpdated,
}: KanbanBoardProps) {
  const [updateError, setUpdateError] = useState<string | null>(null);
  const activeBlueprint = blueprintEngine.getActiveBlueprint();

  const handleMoveStage = async (lead: Lead, direction: "next" | "prev") => {
    const stageIds: Lead["status"][] = ["new", "contacted", "qualified", "customer", "unresponsive"];
    const currentIndex = stageIds.indexOf(lead.status);
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < stageIds.length) {
      setUpdateError(null);
      try {
        await updateLead(lead.id, { status: stageIds[nextIndex] });
        onLeadUpdated();
      } catch (error: unknown) {
        setUpdateError(error instanceof Error ? error.message : "Lead status could not be saved");
      }
    }
  };

  return (
    <div className="space-y-4">
      {updateError && (
        <div className="rounded-xl border border-rose-900/80 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">
          Status leadu nebyl uložen: {updateError}
        </div>
      )}
      {/* Active Industry Blueprint Header Pill */}
      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-400">Aktivní šablona:</span>
          <span className="font-semibold text-zinc-200">{activeBlueprint.name}</span>
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            {activeBlueprint.targetAudience}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>{activeBlueprint.customAttributes.length} EAV polí aktivních</span>
        </div>
      </div>

      {/* 5-Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[640px] items-start">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          const avgScore =
            stageLeads.length > 0
              ? Math.round(stageLeads.reduce((sum, l) => sum + l.ai_score, 0) / stageLeads.length)
              : 0;

          return (
            <div
              key={stage.id}
              className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex flex-col space-y-4 shadow-sm"
            >
              {/* Column Header & Aggregation Metrics */}
              <div className="border-b border-zinc-800/80 pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    {stage.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="flex items-center justify-end text-[11px] text-zinc-400 font-mono pt-1">
                  {avgScore > 0 && (
                    <span className="flex items-center gap-1 text-zinc-400 font-mono">
                      <Sparkles className="w-3 h-3 text-zinc-400" />
                      {avgScore}
                    </span>
                  )}
                </div>
              </div>

              {/* Lead Cards List */}
              <div className="space-y-3 flex-1 min-h-[400px]">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-zinc-600 border border-dashed border-zinc-800/60 rounded-xl font-mono">
                    Žádní leadi v této fázi
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3 group shadow-xs"
                    >
                      {/* Card Top: Name & AI Score */}
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="text-left font-semibold text-xs text-zinc-100 hover:text-zinc-300 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {lead.full_name}
                        </button>

                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                          <Sparkles className="w-2.5 h-2.5 text-zinc-400" />
                          {lead.ai_score}
                        </div>
                      </div>

                      {/* Company & Contact Info */}
                      <div className="text-[11px] text-zinc-400 space-y-0.5 font-sans">
                        <div className="truncate text-zinc-300 font-medium">
                          {lead.company || "Independent"}
                        </div>
                        <div className="font-mono text-zinc-500 text-[10px]">{lead.phone}</div>
                      </div>

                      {/* Industry EAV Custom Badge */}
                      {activeBlueprint.customAttributes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {activeBlueprint.customAttributes[0].name}: {activeBlueprint.customAttributes[0].defaultValue ? String(activeBlueprint.customAttributes[0].defaultValue) : "Standard"}
                          </span>
                        </div>
                      )}

                      {/* Quick Call Action */}
                      <div className="flex items-center justify-end pt-2 border-t border-zinc-800/60">
                        <button
                          onClick={() => onStartCall(lead)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
                          title="Vytočit hovor"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Stage Move Controls */}
                      <div className="flex items-center justify-between pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveStage(lead, "prev")}
                          disabled={stage.id === "new"}
                          className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 cursor-pointer"
                          title="Posunout zpět"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-[10px] text-zinc-600 font-mono uppercase">Posunout</span>

                        <button
                          onClick={() => handleMoveStage(lead, "next")}
                          disabled={stage.id === "unresponsive"}
                          className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-20 cursor-pointer"
                          title="Posunout vpřed"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
