"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Database,
  LockKeyhole,
  Plus,
  Search,
  Layers,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  createCustomObjectRecordAction,
  loadCustomObjectPageAction,
} from "@/app/actions/schema";
import type {
  CustomObjectActionFailure,
  CustomObjectPageData,
  ObjectSchema,
  RecordEntity,
} from "@/lib/schema/types";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CustomObjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || "deals";

  const [schema, setSchema] = useState<ObjectSchema | null>(null);
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [loadResult, setLoadResult] = useState<
    { ok: true; data: CustomObjectPageData } | CustomObjectActionFailure | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecordValues, setNewRecordValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let isCurrent = true;

    void loadCustomObjectPageAction(slug)
      .then((result) => {
        if (!isCurrent) return;
        setLoadResult(result);
        if (!result.ok) {
          setLoadedSlug(slug);
          return;
        }
        setSchema(result.data.schemas.find((item) => item.slug === slug) || null);
        setRecords(result.data.records);
        setLoadedSlug(slug);
      })
      .catch(() => {
        if (!isCurrent) return;
        setLoadResult({
          ok: false,
          code: "UNAVAILABLE",
          status: 503,
          message: "Custom objects are temporarily unavailable. No object data was shown.",
        });
        setSchema(null);
        setRecords([]);
        setLoadedSlug(slug);
      })

    return () => {
      isCurrent = false;
    };
  }, [slug]);

  if (loadedSlug !== slug) {
    return <div className="p-8 text-xs text-zinc-500">Načítám objekt z workspace...</div>;
  }

  if (loadResult && !loadResult.ok) {
    return (
      <div className="p-8 space-y-4 max-w-screen-2xl mx-auto">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <ChevronLeft className="w-4 h-4" /> Zpět do nastavení
        </button>
        <div
          className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl"
          role="alert"
          aria-live="polite"
        >
          <LockKeyhole className="w-10 h-10 text-zinc-500 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-base font-bold text-zinc-200">Custom objects unavailable</h1>
          <p className="text-xs text-zinc-400 mt-1">{loadResult.message}</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="p-8 space-y-4 max-w-screen-2xl mx-auto">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <ChevronLeft className="w-4 h-4" /> Zpět do nastavení
        </button>
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Database className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">
            Objekt &quot;{slug}&quot; nebyl nalezen
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Vytvořte tento dynamický objekt v Nastavení (Schema Engine).
          </p>
        </div>
      </div>
    );
  }

  const handleAddRecord = async () => {
    setSaveError(null);
    try {
      const result = await createCustomObjectRecordAction(slug, newRecordValues);
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      setRecords((current) => [result.data, ...current]);
      setNewRecordValues({});
      setIsAddModalOpen(false);
    } catch {
      setSaveError("Custom objects are temporarily unavailable. No object data was changed.");
    }
  };

  const filteredRecords = records.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(rec.values).some((v) =>
      String(v).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      <PageHeader
        icon={Database}
        title={schema.name}
        badge={{ label: `${filteredRecords.length} záznamů`, tone: "neutral" }}
        description={schema.description}
        backLink={{ href: "/settings", label: "Zpět do nastavení" }}
        actions={
          <>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Hledat v ${schema.name}...`}
                aria-label={`Hledat v ${schema.name}`}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-700 focus:outline-none sm:w-56"
              />
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition-all hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nový záznam</span>
            </button>
          </>
        }
      />

      {/* Schema Attributes Header Ribbon */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-xs">
        <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          Definované EAV pole ({schema.attributes.length}):
        </span>
        {schema.attributes.map((attr) => (
          <span
            key={attr.id}
            className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 text-[11px] font-medium"
          >
            {attr.name} <span className="text-zinc-400 font-mono">({attr.type})</span>
          </span>
        ))}
      </div>

      {/* Records Table View */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 border-b border-zinc-800/80 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">ID / Kód</th>
                {schema.attributes.map((attr) => (
                  <th key={attr.id} className="py-3.5 px-4">
                    {attr.name}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right">Vytvořeno</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={schema.attributes.length + 2}
                    className="text-center py-12 text-zinc-600 text-xs"
                  >
                    Žádné záznamy nenalezeny. Klikněte na &quot;Nový záznam&quot;.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-zinc-900/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {rec.id}
                    </td>

                    {schema.attributes.map((attr) => {
                      const val = rec.values[attr.key];
                      return (
                        <td key={attr.id} className="py-3.5 px-4">
                          {attr.type === "number" ? (
                            <span className="font-mono text-zinc-200 font-semibold">
                              {typeof val === "number"
                                ? val.toLocaleString()
                                : String(val || 0)}
                            </span>
                          ) : attr.type === "select" ? (
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px]">
                              {String(val || "N/A")}
                            </span>
                          ) : (
                            <span className="text-zinc-200 font-medium">
                              {String(val || "—")}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right font-mono text-[10px] text-zinc-500">
                      {new Date(rec.createdAt).toLocaleDateString("cs-CZ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-zinc-300" />
                <h3 className="text-base font-bold text-zinc-100">
                  Přidat nový záznam do {schema.name}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {saveError && (
                <div className="p-3 rounded-lg border border-rose-900/60 bg-rose-950/20 text-rose-300" role="alert">
                  {saveError}
                </div>
              )}
              {schema.attributes.map((attr) => (
                <div key={attr.id} className="space-y-1.5">
                  <label className="text-zinc-400 font-medium block">
                    {attr.name} ({attr.type})
                  </label>

                  {attr.type === "select" ? (
                    <select
                      value={String(newRecordValues[attr.key] || "")}
                      onChange={(e) =>
                        setNewRecordValues({
                          ...newRecordValues,
                          [attr.key]: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                    >
                      <option value="">Vyberte...</option>
                      {attr.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : attr.type === "number" ? (
                    <input
                      type="number"
                      value={Number(newRecordValues[attr.key] || 0)}
                      onChange={(e) =>
                        setNewRecordValues({
                          ...newRecordValues,
                          [attr.key]: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(newRecordValues[attr.key] || "")}
                      onChange={(e) =>
                        setNewRecordValues({
                          ...newRecordValues,
                          [attr.key]: e.target.value,
                        })
                      }
                      placeholder={`Zadejte ${attr.name}...`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium rounded-xl border border-zinc-800 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Uložit záznam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
