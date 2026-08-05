"use client";

import React, { useState } from "react";
import {
  Database,
  Sparkles,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lead } from "@/lib/leads";
import { schemaEngine } from "@/lib/schema/engine";
import { AttributeDefinition, RecordEntity } from "@/lib/schema/types";
import { computeAiAttribute } from "@/lib/schema/aiAttributes";

// ─── Props ──────────────────────────────────────────────────────────────────

interface DynamicAttributesCardProps {
  lead: Lead;
}

// ─── Lead → RecordEntity Mapper ─────────────────────────────────────────────

function leadToRecordEntity(lead: Lead): RecordEntity {
  return {
    id: lead.id,
    schemaSlug: "leads",
    values: {
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      ai_score: lead.ai_score,
      ai_summary: lead.notes, // Map notes as initial AI summary source
      city: lead.city,
      country: lead.country,
      value: lead.value,
    },
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  };
}

// ─── Inline Field Renderer ──────────────────────────────────────────────────

function AttributeField({
  attribute,
  record,
  onValueUpdate,
}: {
  attribute: AttributeDefinition;
  record: RecordEntity;
  onValueUpdate: (key: string, value: unknown) => void;
}) {
  const [isComputing, setIsComputing] = useState(false);
  const value = record.values[attribute.key] ?? attribute.defaultValue;

  const handleComputeAi = async () => {
    setIsComputing(true);
    try {
      const result = await computeAiAttribute(attribute, record);
      onValueUpdate(attribute.key, result.value);
    } catch (err) {
      console.error("AI computation error:", err);
    } finally {
      setIsComputing(false);
    }
  };

  // ── AI Generated Field ──
  if (attribute.type === "ai_generated") {
    return (
      <div className="flex items-center justify-between py-2 px-3 bg-zinc-950/40 border border-zinc-800/60 rounded-lg group">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              {attribute.name}
            </p>
            <p className="text-xs text-zinc-200 font-medium truncate">
              {value ? String(value) : "Nepočítáno"}
            </p>
          </div>
        </div>
        <button
          onClick={handleComputeAi}
          disabled={isComputing}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Přepočítat pomocí AI"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isComputing && "animate-spin text-zinc-200")}
          />
        </button>
      </div>
    );
  }

  // ── Select Field ──
  if (attribute.type === "select") {
    const matchedOpt = attribute.options?.find((o) => o.value === value);

    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[11px] text-zinc-500">{attribute.name}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-[10px] font-mono">
          {matchedOpt?.label || String(value || "N/A")}
        </span>
      </div>
    );
  }

  // ── Boolean Field ──
  if (attribute.type === "boolean") {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[11px] text-zinc-500">{attribute.name}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border bg-zinc-900 border-zinc-800 text-zinc-300"
          )}
        >
          {value ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-zinc-500" />}
          {value ? "Ano" : "Ne"}
        </span>
      </div>
    );
  }

  // ── Number Field ──
  if (attribute.type === "number") {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-[11px] text-zinc-500">{attribute.name}</span>
        <span className="font-mono text-xs font-semibold text-zinc-200">
          {typeof value === "number" ? value.toLocaleString() : String(value || "0")}
        </span>
      </div>
    );
  }

  // ── Text & Default ──
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-zinc-500">{attribute.name}</span>
      <span className="text-xs text-zinc-300 truncate max-w-[160px] text-right">
        {String(value || "—")}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DynamicAttributesCard({ lead }: DynamicAttributesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});

  const leadsSchema = schemaEngine.getSchema("leads");
  if (!leadsSchema) return null;

  // Build record entity from lead + any locally updated AI values
  const baseRecord = leadToRecordEntity(lead);
  const record: RecordEntity = {
    ...baseRecord,
    values: { ...baseRecord.values, ...localValues },
  };

  // Separate system fields (already shown in profile) from dynamic/AI fields
  const systemFieldKeys = new Set(["full_name", "phone", "email", "company"]);
  const dynamicAttributes = leadsSchema.attributes.filter(
    (attr) => !systemFieldKeys.has(attr.key)
  );

  const aiAttributes = dynamicAttributes.filter((a) => a.type === "ai_generated");
  const standardAttributes = dynamicAttributes.filter((a) => a.type !== "ai_generated");

  const handleValueUpdate = (key: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-1.5">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <Database className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300 transition-colors">
          Dynamic Attributes (EAV)
        </span>
        <span className="text-[10px] text-zinc-600 ml-1">
          {dynamicAttributes.length} polí
        </span>
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {/* AI Attributes Section */}
          {aiAttributes.length > 0 && (
            <div className="space-y-1.5">
              {aiAttributes.map((attr) => (
                <AttributeField
                  key={attr.id}
                  attribute={attr}
                  record={record}
                  onValueUpdate={handleValueUpdate}
                />
              ))}
            </div>
          )}

          {/* Standard Dynamic Attributes */}
          {standardAttributes.length > 0 && (
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-3 space-y-0.5">
              {standardAttributes.map((attr) => (
                <AttributeField
                  key={attr.id}
                  attribute={attr}
                  record={record}
                  onValueUpdate={handleValueUpdate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
