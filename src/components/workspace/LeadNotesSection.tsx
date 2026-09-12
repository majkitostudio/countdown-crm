"use client";

import { useState } from "react";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";
import { LeadNotesCard } from "@/components/workspace/LeadNotesCard";

interface LeadNotesSectionProps {
  leadId: string;
  initialNotes: LeadNoteDTO[];
}

export function LeadNotesSection({ leadId, initialNotes }: LeadNotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes);

  return <LeadNotesCard leadId={leadId} notes={notes} onNotesChange={setNotes} />;
}
