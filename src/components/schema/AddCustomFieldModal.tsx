"use client";

import React, { useState } from "react";
import { X, Plus, Sliders } from "lucide-react";
import { AttributeDefinition, AttributeType } from "@/lib/schema/types";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface AddCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddField: (attribute: AttributeDefinition) => void | Promise<void>;
}

export function AddCustomFieldModal({
  isOpen,
  onClose,
  onAddField,
}: AddCustomFieldModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AttributeType>("text");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const newAttribute: AttributeDefinition = {
      id: `attr-custom-${Date.now()}`,
      key,
      name: name.trim(),
      type,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onAddField(newAttribute);
      setName("");
      onClose();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Pole se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <Surface variant="overlay" className="w-full">
        <div className="mx-auto w-full max-w-md space-y-6 p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Add Custom Field</h3>
              <p className="text-xs text-zinc-400">Create custom dynamic attribute (Attio Schema)</p>
            </div>
          </div>
          <Button variant="quiet" onClick={onClose} aria-label="Close custom field dialog">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">Field Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Contract Renewal Date, Deal Priority"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">Attribute Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AttributeType)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="text">Text (String)</option>
              <option value="number">Number (Currency / Integer)</option>
              <option value="select">Select (Dropdown Options)</option>
              <option value="boolean">Boolean (Yes / No)</option>
            </select>
          </div>

          {saveError && (
            <StatusAlert tone="danger">
              {saveError}
            </StatusAlert>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              <Plus className="w-4 h-4" />
              {isSaving ? "Saving…" : "Add Field"}
            </Button>
          </div>
        </form>

        </div>
      </Surface>
    </div>
  );
}
