"use client";

import React, { useState } from "react";
import { X, Plus, Sparkles, Sliders } from "lucide-react";
import { AttributeDefinition, AttributeType } from "@/lib/schema/types";

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
  const [promptTemplate, setPromptTemplate] = useState("");
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
      ...(type === "ai_generated" ? {
        aiConfig: {
          promptTemplate: promptTemplate.trim() || `Compute ${name} using lead context.`,
          contextSources: ["lead_notes", "transcript"],
        }
      } : {})
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      await onAddField(newAttribute);
      setName("");
      setPromptTemplate("");
      onClose();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Pole se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
        
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
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xs">
            <X className="w-5 h-5" />
          </button>
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
              <option value="ai_generated">✨ AI Generated (Gemini Computed)</option>
            </select>
          </div>

          {type === "ai_generated" && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                Gemini AI Prompt Rule
              </label>
              <textarea
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                placeholder="e.g. Calculate lead purchase intent score (0-100)..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>
          )}

          {saveError && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300" role="alert">
              {saveError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? "Saving…" : "Add Field"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
