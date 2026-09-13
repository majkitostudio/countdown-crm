"use client";

import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Sparkles,
  Plus,
  UserCheck,
  PhoneCall,
  FileText
} from "lucide-react";
import { Lead } from "@/lib/leads";
import { createLeadNoteAction } from "@/app/actions/leadNotes";
import { updateLeadStatusAction } from "@/app/actions/crm";
import { WorkspaceActivity } from "@/lib/domain";
import { getLeadActivities } from "@/lib/domainActivity";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, SelectField, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";

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
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

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
    setStatusError(null);

    try {
      const saved = await updateLeadStatusAction(currentLead.id, newStatus);
      setCurrentLead({
        ...currentLead,
        ...saved,
        email: saved.email || null,
        city: saved.city || null,
        country: saved.country || "CZ",
        notes: saved.notes || null,
        company: saved.company || null,
      });
      onLeadUpdated();

      setActivitiesError(null);
      try {
        setActivities(await getLeadActivities(currentLead.id));
      } catch (error: unknown) {
        setActivitiesError(error instanceof Error ? error.message : "Activity timeline unavailable");
      }
    } catch (error: unknown) {
      setStatusError(error instanceof Error ? error.message : "Lead status could not be saved");
    }
  };

  const handleAddNote = async () => {
    if (!currentLead || !newNote.trim() || isSavingNote) return;

    setIsSavingNote(true);
    setActivitiesError(null);
    try {
      await createLeadNoteAction(currentLead.id, newNote);
      setActivities(await getLeadActivities(currentLead.id));
      setNewNote("");
    } catch (error) {
      setActivitiesError(error instanceof Error ? error.message : "Note could not be saved");
    } finally {
      setIsSavingNote(false);
    }
  };

  const getScoreColor = () => {
    return "text-zinc-200 border-zinc-800 bg-zinc-900 font-mono";
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="lead-detail-dialog-title" placement="right" size="lg">
        <div className="w-full h-full text-zinc-100 flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-zinc-200">
                {currentLead.full_name.charAt(0)}
              </div>
              <div>
                <h2 id="lead-detail-dialog-title" className="text-lg font-semibold tracking-tight text-zinc-100">
                  {currentLead.full_name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>{currentLead.company || "Independent"}</span>
                  <span>•</span>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[currentLead.city, currentLead.country].filter(Boolean).join(", ") || "Location unavailable"}</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={onClose}
              variant="quiet"
              aria-label="Close lead detail"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Quick Action Bar & AI Score Banner */}
            <div className="grid grid-cols-2 gap-3">
              
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
                <FieldLabel htmlFor="lead-status">Status</FieldLabel>
                <SelectField
                  id="lead-status"
                  value={currentLead.status}
                  onChange={(e) => handleStatusChange(e.target.value as Lead["status"])}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="customer">Customer</option>
                  <option value="unresponsive">Unresponsive</option>
                </SelectField>
                {statusError && (
                  <StatusAlert tone="danger">
                    Status nebyl uložen: {statusError}
                  </StatusAlert>
                )}
              </div>

            </div>

            {/* Quick Action Button */}
            <div className="flex gap-3">
              <Button
                onClick={() => onStartCall && onStartCall(currentLead)}
                className="w-full"
              >
                <PhoneCall className="w-4 h-4 fill-current" />
                Start Virtual Call
              </Button>
              
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
                  <span className="text-zinc-200">{[currentLead.city, currentLead.country].filter(Boolean).join(", ") || "Location unavailable"}</span>
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
              <FieldLabel htmlFor="lead-note">
                Add Call Note
              </FieldLabel>
              <div className="flex gap-2">
                <TextField
                  id="lead-note"
                  type="text"
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Type note regarding customer preference or agreement..."
                  maxLength={2000}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleAddNote();
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void handleAddNote()}
                  disabled={isSavingNote || !newNote.trim()}
                  variant="secondary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSavingNote ? "Saving..." : "Add"}
                </Button>
              </div>
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
    </Dialog>
  );
}
