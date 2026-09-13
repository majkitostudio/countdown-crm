"use client";

import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { addCallTranscripts } from "@/lib/callTranscriptsStore";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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
    <Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="transcript-uploader-dialog-title">
      <Surface variant="inset">
        <div className="space-y-4 p-6 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h2 id="transcript-uploader-dialog-title" className="text-base font-bold">Nahrát transkripce hovorů (CSV/JSON)</h2>
          <Button variant="quiet" onClick={onClose}>
            <X className="w-4 h-4 text-zinc-400" />
          </Button>
        </div>
        {/* Body */}
        <div className="space-y-3">
          <TextField
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
          />
          {error && <StatusAlert tone="danger">{error}</StatusAlert>}
          {success && <StatusAlert tone="success">{success}</StatusAlert>}
        </div>
        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
          <Button
            variant="primary"
            onClick={handleUpload}
          >
            <Upload className="w-4 h-4" />
            <span>Nahrát</span>
          </Button>
          <Button
            variant="quiet"
            onClick={onClose}
          >
            Zrušit
          </Button>
        </div>
        </div>
      </Surface>
    </Dialog>
  );
}
