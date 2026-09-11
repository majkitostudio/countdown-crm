"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createLeadAction } from "@/app/actions/crm";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <Surface variant="overlay" className="w-full">
      <div className="w-full max-w-lg p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Create Lead</h2>
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
          <label className="block text-xs text-zinc-300">
            Full name <span className="text-rose-400">*</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <label className="block text-xs text-zinc-300">
            Phone <span className="text-rose-400">*</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
              />
            </label>
            <label className="block text-xs text-zinc-300">
              City
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
              />
            </label>
          </div>

          <label className="block text-xs text-zinc-300">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
            />
          </label>

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
      </Surface>
    </div>
  );
}
