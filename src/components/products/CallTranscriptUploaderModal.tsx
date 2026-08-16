"use client";

import React, { useState } from "react";
import { X, Upload, Check } from "lucide-react";
import { addCallTranscripts } from "@/lib/callTranscriptsStore";

type UploadedFile = File | null;
type ParsedRecord = Record<string, unknown>;

export function CallTranscriptUploaderModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<UploadedFile>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const parseCSV = (text: string) => {
    // Simple CSV parser: first line headers, rest rows
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",");
    return lines.slice(1).map((row) => {
      const cols = row.split(",");
      const obj: ParsedRecord = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = cols[i]?.trim();
      });
      return obj;
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Vyberte soubor k nahrání.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        let records: ParsedRecord[] = [];
        if (file.name.endsWith(".json")) {
          const parsed: unknown = JSON.parse(text);
          if (!Array.isArray(parsed) || !parsed.every((record) => typeof record === "object" && record !== null)) {
            throw new Error("JSON musí obsahovat seznam objektů.");
          }
          records = parsed as ParsedRecord[];
        } else if (file.name.endsWith(".csv")) {
          records = parseCSV(text);
        } else {
          throw new Error("Podporované formáty: .json, .csv");
        }
        // Normalize to CallTranscript shape
        const transcripts = records.map((r) => ({
          callId: typeof r.callId === "string" ? r.callId : typeof r.call_id === "string" ? r.call_id : undefined,
          transcript: typeof r.transcript === "string" ? r.transcript : typeof r.text === "string" ? r.text : "",
        }));
        addCallTranscripts(transcripts);
        setSuccess(`Úspěšně nahráno ${transcripts.length} transkriptů.`);
        setFile(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Neznámá chyba při zpracování souboru.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h2 className="text-base font-bold">Nahrát transkripce hovorů (CSV/JSON)</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
        {/* Body */}
        <div className="space-y-3">
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="w-full text-xs text-zinc-200 file:mr-4 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"
          />
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          {success && <p className="text-emerald-400 text-xs">{success}</p>}
        </div>
        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            <span>Nahrát</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
}
