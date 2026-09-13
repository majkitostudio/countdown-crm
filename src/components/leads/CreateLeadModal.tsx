"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createLeadAction } from "@/app/actions/crm";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, TextAreaField, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await createLeadAction({
        full_name: fullName,
        phone,
        email: email || null,
        city: city || null,
        notes: notes || null,
      });
      setFullName("");
      setPhone("");
      setEmail("");
      setCity("");
      setNotes("");
      await onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Lead se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="create-lead-dialog-title">
      <div className="w-full max-w-lg p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-lead-dialog-title" className="text-base font-semibold text-zinc-100">Create Lead</h2>
            <p className="mt-1 text-xs text-zinc-400">Uloží se přímo do aktivního workspace.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Zavřít"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <StatusAlert tone="danger">
            {errorMessage}
          </StatusAlert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldLabel htmlFor="lead-full-name">
            Full name <span className="text-rose-400">*</span>
            <TextField
              id="lead-full-name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </FieldLabel>

          <FieldLabel htmlFor="lead-phone">
            Phone <span className="text-rose-400">*</span>
            <TextField
              id="lead-phone"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </FieldLabel>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldLabel htmlFor="lead-email">
              Email
              <TextField
                id="lead-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FieldLabel>
            <FieldLabel htmlFor="lead-city">
              City
              <TextField
                id="lead-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </FieldLabel>
          </div>

          <FieldLabel htmlFor="lead-notes">
            Notes
            <TextAreaField
              id="lead-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </FieldLabel>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
