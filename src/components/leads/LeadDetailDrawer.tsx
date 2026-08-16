"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Sparkles,
  Send,
  UserCheck,
  PhoneCall,
  DollarSign,
  FileText
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { WorkspaceActivity } from "@/lib/domain";
import { addLeadActivity, getLeadActivities } from "@/lib/domainActivity";
import { isDemoModeActive } from "@/lib/demoMode";
import { updateLeadStatusInSupabase } from "@/lib/supabase/leadsService";

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: () => void;
  onStartCall?: (lead: Lead) => void;
}

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onStartCall,
}: LeadDetailDrawerProps) {
  const [newNote, setNewNote] = useState("");
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const canAddNotes = isDemoModeActive();

  React.useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setCurrentLead(lead);
      setActivities([]);
      setActivitiesError(null);
      setIsLoadingActivities(Boolean(lead));
    });
    if (!lead) return () => { cancelled = true; };

    void getLeadActivities(lead.id)
      .then((entries) => {
        if (!cancelled) setActivities(entries);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setActivitiesError(error instanceof Error ? error.message : "Activity timeline unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingActivities(false);
      });

    return () => { cancelled = true; };
  }, [lead]);

  if (!isOpen || !currentLead) return null;

  const handleStatusChange = async (newStatus: Lead["status"]) => {
    if (!currentLead) return;
    const saved = await updateLeadStatusInSupabase(currentLead.id, newStatus);
    if (saved) {
      const updated = {
        ...currentLead,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      setCurrentLead(updated);
      onLeadUpdated();

      setActivitiesError(null);
      try {
        setActivities(await getLeadActivities(currentLead.id));
      } catch (error: unknown) {
        setActivitiesError(error instanceof Error ? error.message : "Activity timeline unavailable");
      }
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !currentLead || !canAddNotes) return;
    const newEntry = addLeadActivity(currentLead.id, {
      type: "note",
      title: "Note Added",
      description: newNote.trim(),
      actor: "Unknown operator",
    });
    if (!newEntry) return;
    setActivities((prev) => [newEntry, ...prev]);
    setNewNote("");
  };

  const getScoreColor = () => {
    return "text-zinc-200 border-zinc-800 bg-zinc-900 font-mono";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/80 text-zinc-100 flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-zinc-200">
                {currentLead.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                  {currentLead.full_name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>{currentLead.company || "Independent"}</span>
                  <span>•</span>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{currentLead.city || "Prague"}, {currentLead.country}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Action Bar & AI Score Banner */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* AI Score Box */}
              <div className={`p-4 rounded-xl border flex flex-col justify-center items-center ${getScoreColor()}`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Propensity Score</span>
                </div>
                <div className="text-3xl font-bold tracking-tight font-mono">
                  {currentLead.ai_score}
                  <span className="text-xs text-zinc-400 font-normal">/100</span>
                </div>
              </div>

              {/* Status Select Box */}
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex flex-col justify-center">
                <label className="text-xs text-zinc-400 mb-1 font-medium">Status</label>
                <select
                  value={currentLead.status}
                  onChange={(e) => handleStatusChange(e.target.value as Lead["status"])}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md text-xs font-mono px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="customer">Customer</option>
                  <option value="unresponsive">Unresponsive</option>
                </select>
              </div>

              {/* Deal Value Box */}
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex flex-col justify-center">
                <span className="text-xs text-zinc-400 mb-1 font-medium flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                  Est. Deal Value
                </span>
                <span className="text-lg font-bold text-zinc-100 font-mono">
                  ${currentLead.value || 850}
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex gap-3">
              <button
                onClick={() => onStartCall && onStartCall(currentLead)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 fill-current" />
                Start Virtual Call
              </button>
              
              <a
                href={`mailto:${currentLead.email || ""}`}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg text-sm flex items-center gap-2 transition-colors border border-zinc-700"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            </div>

            {/* Contact Details Grid */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-zinc-500 block mb-0.5">Phone Number</span>
                  <span className="font-mono text-zinc-200">{currentLead.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-0.5">Email Address</span>
                  <span className="text-zinc-200 truncate block">{currentLead.email || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-0.5">Location</span>
                  <span className="text-zinc-200">{currentLead.city || "Prague"}, {currentLead.country}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-0.5">Added On</span>
                  <span className="text-zinc-200 font-mono">
                    {new Date(currentLead.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Insight & Notes */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  AI Summary & Notes
                </h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
                {currentLead.notes || "No notes available for this lead."}
              </p>
            </div>

            {/* Add New Note */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Add Call Note
              </label>
              {canAddNotes ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type note regarding customer preference or agreement..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 border border-zinc-800 rounded-lg px-3 py-2">
                  Notes unavailable in Production DB until note persistence is implemented.
                </p>
              )}
            </div>

            {/* Activity & Interaction Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Activity Timeline
              </h3>
              
              {isLoadingActivities && <p className="text-xs text-zinc-500">Loading activity timeline...</p>}
              {activitiesError && (
                <p role="alert" className="text-xs text-rose-300 border border-rose-900/60 bg-rose-950/20 rounded-lg px-3 py-2">
                  Activity timeline unavailable: {activitiesError}
                </p>
              )}
              {!isLoadingActivities && !activitiesError && activities.length === 0 && (
                <p className="text-xs text-zinc-500">No persisted activities for this lead.</p>
              )}
              {!activitiesError && activities.length > 0 && <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {activities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      {act.type === "call" ? (
                        <Phone className="w-2.5 h-2.5 text-zinc-400" />
                      ) : act.type === "status_change" ? (
                        <UserCheck className="w-2.5 h-2.5 text-zinc-400" />
                      ) : (
                        <FileText className="w-2.5 h-2.5 text-zinc-400" />
                      )}
                    </div>
                    
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-200">{act.title}</span>
                        <span className="text-zinc-500 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-normal">
                        {act.description}
                      </p>
                      {act.actor && (
                        <div className="mt-2 text-[10px] text-zinc-500 font-medium font-mono">
                          Logged by: {act.actor}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
