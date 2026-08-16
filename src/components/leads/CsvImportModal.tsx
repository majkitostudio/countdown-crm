"use client";

import React, { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, Sparkles, ArrowRight } from "lucide-react";
import { Lead, addLeadsBatch, calculateAiLeadScore } from "@/lib/leads";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export function CsvImportModal({ isOpen, onClose, onImportComplete }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<{
    full_name: string;
    phone: string;
    email: string;
    city: string;
    company: string;
    notes: string;
  }>({
    full_name: "",
    phone: "",
    email: "",
    city: "",
    company: "",
    notes: "",
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsvFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const processCsvFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r\n|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) return;

      // Parse headers (assuming comma or semicolon separated)
      const delimiter = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
      
      const parsedRows = lines.slice(1).map((line) =>
        line.split(delimiter).map((cell) => cell.replace(/^["']|["']$/g, "").trim())
      );

      setCsvHeaders(headers);
      setRawRows(parsedRows);

      // Auto-detect header mapping
      const mapping = {
        full_name: headers.find((h) => /name|jmeno|fullname|kontakt/i.test(h)) || headers[0] || "",
        phone: headers.find((h) => /phone|tel|mobil|telefon/i.test(h)) || headers[1] || "",
        email: headers.find((h) => /mail/i.test(h)) || headers[2] || "",
        city: headers.find((h) => /city|mesto|obec/i.test(h)) || "",
        company: headers.find((h) => /company|firma|spolecnost/i.test(h)) || "",
        notes: headers.find((h) => /note|poznamka|desc/i.test(h)) || "",
      };

      setColumnMapping(mapping);
    };
    reader.readAsText(selectedFile);
  };

  const getMappedLeadsPreview = (): Partial<Lead>[] => {
    if (csvHeaders.length === 0 || rawRows.length === 0) return [];

    const getColIndex = (colName: string) => csvHeaders.indexOf(colName);
    const nameIdx = getColIndex(columnMapping.full_name);
    const phoneIdx = getColIndex(columnMapping.phone);
    const emailIdx = getColIndex(columnMapping.email);
    const cityIdx = getColIndex(columnMapping.city);
    const companyIdx = getColIndex(columnMapping.company);
    const notesIdx = getColIndex(columnMapping.notes);

    return rawRows.slice(0, 3).map((row) => {
      const leadData: Partial<Lead> = {
        full_name: nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : "Unnamed Lead",
        phone: phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : "+420 600 000 000",
        email: emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : null,
        city: cityIdx !== -1 && row[cityIdx] ? row[cityIdx] : "Prague",
        company: companyIdx !== -1 && row[companyIdx] ? row[companyIdx] : null,
        notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : "Imported from CSV",
        status: "new",
      };
      leadData.ai_score = calculateAiLeadScore(leadData);
      return leadData;
    });
  };

  const handleExecuteImport = async () => {
    if (rawRows.length === 0) return;
    setIsImporting(true);

    const getColIndex = (colName: string) => csvHeaders.indexOf(colName);
    const nameIdx = getColIndex(columnMapping.full_name);
    const phoneIdx = getColIndex(columnMapping.phone);
    const emailIdx = getColIndex(columnMapping.email);
    const cityIdx = getColIndex(columnMapping.city);
    const companyIdx = getColIndex(columnMapping.company);
    const notesIdx = getColIndex(columnMapping.notes);

    const leadsToInsert: Partial<Lead>[] = rawRows.map((row) => {
      const item: Partial<Lead> = {
        full_name: nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : "Imported Lead",
        phone: phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : "+420 700 000 000",
        email: emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : null,
        city: cityIdx !== -1 && row[cityIdx] ? row[cityIdx] : "Prague",
        company: companyIdx !== -1 && row[companyIdx] ? row[companyIdx] : null,
        notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : "CSV Import",
        status: "new",
      };
      item.ai_score = calculateAiLeadScore(item);
      return item;
    });

    await addLeadsBatch(leadsToInsert);

    setIsImporting(false);
    onImportComplete(leadsToInsert.length);
    onClose();
  };

  const previewItems = getMappedLeadsPreview();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-xl text-zinc-100 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-900 text-zinc-300 rounded-lg border border-zinc-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Import Leads from CSV</h2>
              <p className="text-xs text-zinc-400">Upload CSV file and map fields with auto AI propensity scoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* File Upload Zone */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 bg-zinc-950/50 hover:bg-zinc-900/60 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Click to upload or drag & drop CSV file
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports comma (,) or semicolon (;) separated .csv files up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-zinc-300" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{file.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {rawRows.length} rows detected • {csvHeaders.length} columns
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setRawRows([]);
                    setCsvHeaders([]);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 font-medium px-2 py-1 bg-zinc-900 rounded border border-zinc-800"
                >
                  Change File
                </button>
              </div>

              {/* Column Mapping Selector */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Column Field Mapping
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 p-4 border border-zinc-800 rounded-xl text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Full Name *</label>
                    <select
                      value={columnMapping.full_name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, full_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200"
                    >
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Phone Number *</label>
                    <select
                      value={columnMapping.phone}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200"
                    >
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Email Address</label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200"
                    >
                      <option value="">-- None --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">City / Region</label>
                    <select
                      value={columnMapping.city}
                      onChange={(e) => setColumnMapping({ ...columnMapping, city: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200"
                    >
                      <option value="">-- None --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Preview with AI Scoring */}
              {previewItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                      Live AI Score Preview (First 3 Rows)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {previewItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 font-mono">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-200">{item.full_name}</p>
                            <p className="text-zinc-500 font-mono">{item.phone} • {item.email || "No email"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md font-mono">
                          <Sparkles className="w-3 h-3 text-zinc-400" />
                          <span>Score: {item.ai_score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {file && (
            <button
              onClick={handleExecuteImport}
              disabled={isImporting || rawRows.length === 0}
              className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isImporting ? (
                <span>Importing...</span>
              ) : (
                <>
                  <span>Import {rawRows.length} Leads</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
