"use client";

import React, { useState } from "react";
import { Sparkles, RefreshCw, Check, X } from "lucide-react";
import { AttributeDefinition, RecordEntity } from "@/lib/schema/types";
import { computeAiAttribute } from "@/lib/schema/aiAttributes";

interface CustomFieldRendererProps {
  attribute: AttributeDefinition;
  record: RecordEntity;
  onAttributeUpdated?: (key: string, newValue: unknown) => void;
}

export function CustomFieldRenderer({
  attribute,
  record,
  onAttributeUpdated,
}: CustomFieldRendererProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const value = record.values[attribute.key] ?? attribute.defaultValue;

  const handleComputeAi = async () => {
    setIsCalculating(true);
    try {
      const res = await computeAiAttribute(attribute, record);
      if (onAttributeUpdated) {
        onAttributeUpdated(attribute.key, res.value);
      }
    } catch (err) {
      console.error("AI computation error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  switch (attribute.type) {
    case "ai_generated":
      return (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
            <Sparkles className="w-3 h-3 text-zinc-400" />
            <span>{value ? String(value) : "Not computed"}</span>
          </div>
          <button
            onClick={handleComputeAi}
            disabled={isCalculating}
            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Recalculate with Gemini AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? "animate-spin text-zinc-300" : ""}`} />
          </button>
        </div>
      );

    case "select":
      const matchedOpt = attribute.options?.find((o) => o.value === value);
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
          {matchedOpt ? matchedOpt.label : String(value || "N/A")}
        </span>
      );

    case "boolean":
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
          value ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
        }`}>
          {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>{value ? "Yes" : "No"}</span>
        </span>
      );

    case "number":
      return (
        <span className="font-mono text-xs font-semibold text-zinc-200">
          {typeof value === "number" ? value.toLocaleString() : String(value || 0)}
        </span>
      );

    default:
      return (
        <span className="text-xs text-zinc-300 truncate max-w-[200px] block">
          {String(value || "—")}
        </span>
      );
  }
}
