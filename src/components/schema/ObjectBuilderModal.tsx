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
import { saveSchemaAction } from "@/app/actions/schema";
import { AttributeDefinition, AttributeType, ObjectSchema } from "@/lib/schema/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, SelectField, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";

interface ObjectBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaCreated: (schema: ObjectSchema) => void | Promise<void>;
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const createdSchema = await saveSchemaAction({
        id: `schema-${slug.trim()}`,
        slug: slug.trim(),
        name: name.trim(),
        description: description.trim() || "Uživatelsky definovaný dynamický objekt",
        iconName,
        attributes,
      });

      await onSchemaCreated(createdSchema);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Objekt se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="object-builder-dialog-title" size="lg">
        <div className="relative mx-auto flex w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Database className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 id="object-builder-dialog-title" className="text-base font-bold text-zinc-100">
                Vytvořit Nový Dynamický Objekt (Custom Object)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Definujte novou entitu v CRM (např. Objednávky, Lístky podpory, Projekty) po vzoru Attio.
              </p>
            </div>
          </div>
          <Button
            variant="quiet"
            onClick={onClose}
            aria-label="Close object builder"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="object-name">
                Název objektu
              </FieldLabel>
              <TextField
                id="object-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="např. Projekty / Deals"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="object-slug">
                Systémový Slug (ID)
              </FieldLabel>
              <TextField
                id="object-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="např. deals"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="object-description">
              Popis objektu
            </FieldLabel>
            <TextField
              id="object-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="K čemu tento objekt v CRM slouží..."
            />
          </div>

          {/* Attributes List Header */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                EAV Atributy objektu ({attributes.length})
              </span>
              <Button variant="secondary"
                onClick={addAttribute}
              >
                <Plus className="w-3.5 h-3.5" />
                Přidat pole
              </Button>
            </div>

            {/* List of Fields */}
            <div className="space-y-2">
              {attributes.map((attr, idx) => (
                <div
                  key={attr.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3"
                >
                  <div className="flex-1">
                  <TextField
                    type="text"
                    value={attr.name}
                    onChange={(e) => updateAttribute(idx, { name: e.target.value })}
                    placeholder="Název pole"
                  />
                  </div>

                  <div className="w-28">
                  <TextField
                    type="text"
                    value={attr.key}
                    onChange={(e) => updateAttribute(idx, { key: e.target.value })}
                    placeholder="key"
                  />
                  </div>

                  <div className="w-32">
                  <SelectField
                    value={attr.type}
                    onChange={(e) =>
                      updateAttribute(idx, { type: e.target.value as AttributeType })
                    }
                  >
                    <option value="text">Text</option>
                    <option value="number">Číslo ($ / %)</option>
                    <option value="select">Výběr (Select)</option>
                    <option value="boolean">Ano / Ne</option>
                  </SelectField>
                  </div>

                  {attributes.length > 1 && (
                    <Button
                      variant="danger"
                      onClick={() => removeAttribute(idx)}
                      aria-label={`Remove ${attr.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950">
          {saveError ? (
            <StatusAlert tone="danger" role="alert">{saveError}</StatusAlert>
          ) : (
            <span />
          )}
          <Button variant="secondary"
            onClick={onClose}
          >
            Zrušit
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || !slug.trim() || isSaving}
          >
            <Check className="w-4 h-4" />
            {isSaving ? "Ukládám..." : "Vytvořit objekt"}
          </Button>
        </div>
        </div>
    </Dialog>
  );
}
