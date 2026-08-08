"use client";

import React, { useState } from "react";
import {
  Database,
  X,
  Plus,
  Trash2,
  Check,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaEngine } from "@/lib/schema/engine";
import { AttributeDefinition, AttributeType } from "@/lib/schema/types";

interface ObjectBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaCreated: () => void;
}

export function ObjectBuilderModal({
  isOpen,
  onClose,
  onSchemaCreated,
}: ObjectBuilderModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconName] = useState("Database");

  const [attributes, setAttributes] = useState<AttributeDefinition[]>([
    {
      id: "attr-default-name",
      key: "title",
      name: "Název položky",
      type: "text",
      required: true,
    },
  ]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
      );
    }
  };

  const addAttribute = () => {
    const newAttr: AttributeDefinition = {
      id: `attr-${Date.now()}`,
      key: `field_${attributes.length + 1}`,
      name: `Vlastní pole ${attributes.length + 1}`,
      type: "text",
    };
    setAttributes([...attributes, newAttr]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, updates: Partial<AttributeDefinition>) => {
    setAttributes(
      attributes.map((attr, i) => (i === index ? { ...attr, ...updates } : attr))
    );
  };

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) return;

    schemaEngine.addCustomSchema({
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || "Uživatelsky definovaný dynamický objekt",
      iconName,
      attributes,
    });

    onSchemaCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Database className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Vytvořit Nový Dynamický Objekt (Custom Object)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Definujte novou entitu v CRM (např. Objednávky, Lístky podpory, Projekty) po vzoru Attio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Název objektu
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="např. Projekty / Deals"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Systémový Slug (ID)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="např. deals"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Popis objektu
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="K čemu tento objekt v CRM slouží..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Attributes List Header */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                EAV Atributy objektu ({attributes.length})
              </span>
              <button
                onClick={addAttribute}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Přidat pole
              </button>
            </div>

            {/* List of Fields */}
            <div className="space-y-2">
              {attributes.map((attr, idx) => (
                <div
                  key={attr.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => updateAttribute(idx, { name: e.target.value })}
                    placeholder="Název pole"
                    className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
                  />

                  <input
                    type="text"
                    value={attr.key}
                    onChange={(e) => updateAttribute(idx, { key: e.target.value })}
                    placeholder="key"
                    className="w-28 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none"
                  />

                  <select
                    value={attr.type}
                    onChange={(e) =>
                      updateAttribute(idx, { type: e.target.value as AttributeType })
                    }
                    className="w-32 px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="number">Číslo ($ / %)</option>
                    <option value="select">Výběr (Select)</option>
                    <option value="boolean">Ano / Ne</option>
                    <option value="ai_generated">AI Generované ✨</option>
                  </select>

                  {attributes.length > 1 && (
                    <button
                      onClick={() => removeAttribute(idx)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !slug.trim()}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer",
              name.trim() && slug.trim()
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
            )}
          >
            <Check className="w-4 h-4" />
            Vytvořit objekt
          </button>
        </div>
      </div>
    </div>
  );
}
