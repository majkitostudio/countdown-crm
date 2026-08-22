"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Highlighter,
  Italic,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";
import { getProductScriptAction } from "@/app/actions/productScripts";
import { Product } from "@/lib/products";
import { getProductScript } from "@/lib/productScripts";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  onApplyPitch?: (pitchText: string) => void;
}

type SuggestionType = "default" | "price" | "effectiveness" | "hesitation";
type ScriptFontKey = "product" | "arial" | "verdana" | "trebuchet";

const SCRIPT_FONT_OPTIONS: Record<ScriptFontKey, { label: string; value: string }> = {
  product: { label: "Poppins", value: "Poppins, ui-sans-serif, sans-serif" },
  arial: { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  verdana: { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  trebuchet: { label: "Trebuchet MS", value: "'Trebuchet MS', Arial, sans-serif" },
};

const LETTER_SPACING_OPTIONS = {
  normal: { label: "Standard", value: "0em" },
  comfortable: { label: "Pohodlné", value: "0.02em" },
  wide: { label: "Široké", value: "0.04em" },
} as const;

type LetterSpacingKey = keyof typeof LETTER_SPACING_OPTIONS;

export function ProductScriptPanel({ product, isCallActive, onApplyPitch }: ProductScriptPanelProps) {
  const script = useMemo(() => getProductScript(product), [product]);
  const editorRef = useRef<HTMLDivElement>(null);
  const [scriptResource, setScriptResource] = useState<{
    productId: string | null;
    html: string | null;
    status: "idle" | "loading" | "ready" | "not_found" | "error";
    error: string | null;
  }>({ productId: null, html: null, status: "idle", error: null });
  const [showTools, setShowTools] = useState(false);
  const [personalEditingByProduct, setPersonalEditingByProduct] = useState<Record<string, boolean>>({});
  const [personalChangesByProduct, setPersonalChangesByProduct] = useState<Record<string, boolean>>({});
  const [fontSizePx, setFontSizePx] = useState(14);
  const [letterSpacing, setLetterSpacing] = useState<LetterSpacingKey>("normal");
  const [fontFamily, setFontFamily] = useState<ScriptFontKey>("product");
  const [lineHeight, setLineHeight] = useState<"normal" | "relaxed">("normal");
  const [suggestionType, setSuggestionType] = useState<SuggestionType>("default");

  const fallbackHtml = useMemo(() => buildDefaultScriptHtml(product), [product]);
  const currentProductId = product?.id || null;
  const hasCurrentScriptResource = scriptResource.productId === currentProductId;
  const persistedHtml = hasCurrentScriptResource ? scriptResource.html : null;
  const scriptStatus = hasCurrentScriptResource ? scriptResource.status : "loading";
  const scriptLoadError = hasCurrentScriptResource ? scriptResource.error : null;
  const isLoadingScript = Boolean(currentProductId) && scriptStatus === "loading";
  const personalEditing = currentProductId ? Boolean(personalEditingByProduct[currentProductId]) : false;
  const hasPersonalChanges = currentProductId ? Boolean(personalChangesByProduct[currentProductId]) : false;
  const scriptHtml = persistedHtml || (scriptStatus === "not_found" ? fallbackHtml : "");
  const suggestion = suggestionType === "default"
    ? script.nextBestAction
    : script.objectionResponses[suggestionType] || script.objectionResponses.hesitation || script.nextBestAction;
  const suggestionLabel = suggestionType === "default" ? "Next best action" : `${suggestionType} concern`;

  useEffect(() => {
    let cancelled = false;
    const productId = product?.id;
    if (!productId) return () => {
      cancelled = true;
    };

    void getProductScriptAction(productId)
      .then((savedScript) => {
        if (!cancelled) {
          setScriptResource({
            productId,
            html: savedScript?.content_html || null,
            status: savedScript?.content_html ? "ready" : "not_found",
            error: null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setScriptResource({
            productId,
            html: null,
            status: "error",
            error: "The approved script is unavailable. No saved script is being shown.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== scriptHtml) {
      editorRef.current.innerHTML = scriptHtml;
    }
  }, [scriptHtml]);

  const runFormattingCommand = (
    command: "bold" | "italic" | "hiliteColor",
    value?: string,
  ) => {
    if (!personalEditing || !currentProductId) return;
    document.execCommand(command, false, value);
    setPersonalChangesByProduct((current) => ({ ...current, [currentProductId]: true }));
    editorRef.current?.focus();
  };

  const resetPersonalChanges = () => {
    if (!editorRef.current || !currentProductId) return;
    editorRef.current.innerHTML = scriptHtml;
    setPersonalChangesByProduct((current) => ({ ...current, [currentProductId]: false }));
  };

  const resetView = () => {
    resetPersonalChanges();
    setFontSizePx(14);
    setLetterSpacing("normal");
    setFontFamily("product");
    setLineHeight("normal");
  };

  return (
    <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300">
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-100">Product Script</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                Continuous script
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{product?.title || "Select a product"} · approved text</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTools((value) => !value)}
            aria-expanded={showTools}
            aria-label="Script text settings"
            className={`rounded-lg border p-2 transition-colors ${showTools ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"}`}
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <span className={`rounded-md border px-2 py-1 text-[10px] font-mono ${isCallActive ? "border-emerald-800/80 bg-emerald-950/30 text-emerald-300" : "border-zinc-800 text-zinc-500"}`}>
            {isCallActive ? "Active" : "Ready"}
          </span>
        </div>
      </div>

      {showTools && (
        <div className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3" role="toolbar" aria-label="Script text settings">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-zinc-500">Text</span>
            <button type="button" onClick={() => setFontSizePx((value) => Math.max(14, value - 1))} aria-label="Decrease script text" className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"><Minus className="h-3.5 w-3.5" /></button>
            <span className="min-w-12 text-center text-[10px] font-mono text-zinc-400">{fontSizePx}px</span>
            <button type="button" onClick={() => setFontSizePx((value) => Math.min(20, value + 1))} aria-label="Increase script text" className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"><Plus className="h-3.5 w-3.5" /></button>
            <label className="ml-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="sr-only">Script font</span>
              <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value as ScriptFontKey)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-zinc-600" aria-label="Script font">
                {Object.entries(SCRIPT_FONT_OPTIONS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="sr-only">Letter spacing</span>
              <select value={letterSpacing} onChange={(event) => setLetterSpacing(event.target.value as LetterSpacingKey)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none focus:border-zinc-600" aria-label="Letter spacing">
                {Object.entries(LETTER_SPACING_OPTIONS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => setLineHeight((value) => value === "normal" ? "relaxed" : "normal")} className={`rounded-md border px-2 py-1.5 text-[10px] ${lineHeight === "relaxed" ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"}`}>Line spacing</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
            <button type="button" onClick={() => currentProductId && setPersonalEditingByProduct((current) => ({ ...current, [currentProductId]: !personalEditing }))} className={`rounded-md border px-2.5 py-1.5 text-[10px] ${personalEditing ? "border-emerald-800/80 bg-emerald-950/30 text-emerald-300" : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"}`}>
              {personalEditing ? "Personal formatting enabled" : "Enable personal formatting"}
            </button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runFormattingCommand("bold")} disabled={!personalEditing} aria-label="Bold selected text" title="Bold selected text" className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"><Bold className="h-3.5 w-3.5" /></button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runFormattingCommand("italic")} disabled={!personalEditing} aria-label="Italic selected text" title="Italic selected text" className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"><Italic className="h-3.5 w-3.5" /></button>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runFormattingCommand("hiliteColor", "#facc15")} disabled={!personalEditing} aria-label="Highlight selected text" title="Highlight selected text" className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"><Highlighter className="h-3.5 w-3.5" /></button>
            {hasPersonalChanges && <button type="button" onClick={resetPersonalChanges} className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-200"><RotateCcw className="h-3 w-3" />Reset highlights</button>}
            <button type="button" onClick={resetView} className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-200"><RotateCcw className="h-3 w-3" />Reset view</button>
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-600">View preferences and highlights are only for this console session. The approved script is not changed.</p>
        </div>
      )}

      {!scriptLoadError && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pilot suggestion</p>
              <p className="mt-1 text-xs font-semibold text-zinc-200">{suggestionLabel}</p>
            </div>
            <Sparkles className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-sm leading-relaxed text-zinc-100">{suggestion}</p>
          <button type="button" onClick={() => onApplyPitch?.(suggestion)} disabled={!isCallActive} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            Use pilot suggestion
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">This deterministic preview is separate from the saved approved script below.</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {(["default", "price", "effectiveness", "hesitation"] as const).map((type) => (
          <button key={type} type="button" onClick={() => setSuggestionType(type)} className={`rounded-lg border px-2 py-2 text-[10px] font-medium transition-colors ${suggestionType === type ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-zinc-200"}`}>
            {type === "default" ? "Discovery" : type === "hesitation" ? "Hesitation" : `${type[0].toUpperCase()}${type.slice(1)} concern`}
          </button>
        ))}
      </div>

      {scriptLoadError && <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">{scriptLoadError}</p>}
      {scriptStatus === "not_found" && <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-[10px] leading-relaxed text-zinc-500">No saved workspace script exists for this product. Showing the built-in pilot fallback.</p>}
      {isLoadingScript && <p className="text-[10px] text-zinc-600">Checking for the latest approved script…</p>}

      {scriptStatus !== "error" && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40 [scrollbar-color:theme(colors.zinc.700)_transparent] [scrollbar-width:thin]">
          <div
            ref={editorRef}
            contentEditable={personalEditing}
            suppressContentEditableWarning
            onInput={() => currentProductId && setPersonalChangesByProduct((current) => ({ ...current, [currentProductId]: true }))}
            className={`min-h-[360px] p-4 text-zinc-200 outline-none [&_hr]:my-6 [&_hr]:border-zinc-700 [&_mark]:rounded [&_mark]:bg-yellow-300 [&_mark]:px-0.5 [&_p]:mb-4 [&_p:last-child]:mb-0 ${personalEditing ? "cursor-text focus:border-zinc-600" : ""}`}
            style={{ fontSize: `${fontSizePx}px`, fontFamily: SCRIPT_FONT_OPTIONS[fontFamily].value, letterSpacing: LETTER_SPACING_OPTIONS[letterSpacing].value, lineHeight: lineHeight === "relaxed" ? 1.9 : 1.65 }}
            dangerouslySetInnerHTML={{ __html: scriptHtml }}
          />
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[10px] text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Use only the approved product information maintained in the script.
      </div>
    </section>
  );
}
