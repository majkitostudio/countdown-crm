"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, CircleHelp, Maximize2, Minimize2, ShieldCheck, Type } from "lucide-react";
import { getProductScriptAction } from "@/app/actions/productScripts";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { Product } from "@/lib/products";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";
import type { ScriptSnapshotDTO } from "@/lib/dal/productScripts";
import { Button } from "@/components/ui/Button";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  activeSnapshot?: ScriptSnapshotDTO | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  discoveryQuestions?: string[];
}

export function ProductScriptPanel({ product, isCallActive, activeSnapshot = null, isExpanded = false, onToggleExpand, discoveryQuestions = [] }: ProductScriptPanelProps) {
  const [scriptResource, setScriptResource] = useState<{
    productId: string | null;
    html: string | null;
    status: "idle" | "loading" | "ready" | "not_found" | "error";
    error: string | null;
  }>({ productId: null, html: null, status: "idle", error: null });
  const fallbackHtml = useMemo(() => buildDefaultScriptHtml(product), [product]);
  const currentProductId = product?.id || null;
  const hasCurrentScriptResource = scriptResource.productId === currentProductId;
  const persistedHtml = hasCurrentScriptResource ? scriptResource.html : null;
  const scriptStatus = activeSnapshot ? "ready" : hasCurrentScriptResource ? scriptResource.status : "loading";
  const scriptLoadError = activeSnapshot ? null : hasCurrentScriptResource ? scriptResource.error : null;
  const isLoadingScript = Boolean(currentProductId) && scriptStatus === "loading";
  const scriptHtml = activeSnapshot?.html || persistedHtml || (scriptStatus === "not_found" ? fallbackHtml : "");
  const scriptTitle = activeSnapshot?.productTitle || product?.title || "Product Script";
  useEffect(() => {
    let cancelled = false;
    if (activeSnapshot) return () => {
      cancelled = true;
    };
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
  }, [activeSnapshot, product?.id]);

  return (
    <Surface variant="page" className="w-full" data-testid="operator-script-context" aria-labelledby="product-script-title">
      <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300">
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 id="product-script-title" className="text-sm font-semibold text-zinc-100">Product Script</h2>
              <StatusBadge tone="neutral">
                Continuous script
              </StatusBadge>
            </div>
            <p className="text-xs text-zinc-300">{scriptTitle} · read top to bottom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="neutral">
            {isCallActive ? "Active" : "Ready"}
          </StatusBadge>
          {onToggleExpand && (
            <Button
              variant="secondary"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse script" : "Expand script"}
              title={isExpanded ? "Collapse script" : "Expand script"}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          )}
        </div>
      </div>

      {activeSnapshot?.source === "published_version" && (
        <StatusAlert tone="success" className="w-full">
          Version {activeSnapshot.versionNumber} captured for this call
        </StatusAlert>
      )}
      {activeSnapshot?.source === "built_in_fallback" && (
        <StatusAlert tone="neutral" className="w-full">Built-in fallback captured for this call</StatusAlert>
      )}
      {activeSnapshot?.source === "unavailable" && (
        <StatusAlert tone="warning" className="w-full">No script was captured for this call.</StatusAlert>
      )}

      {scriptLoadError && <StatusAlert tone="warning" className="w-full">{scriptLoadError}</StatusAlert>}
      {scriptStatus === "not_found" && <StatusAlert tone="neutral" className="w-full">No saved script for this product — showing the built-in fallback.</StatusAlert>}
      {isLoadingScript && <p className="text-[11px] text-zinc-400">Checking for the latest approved script…</p>}

      {scriptStatus !== "error" && (
        <Surface variant="inset" className="w-full">
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:theme(colors.zinc.700)_transparent] [scrollbar-width:thin]">
          <div
            className="operator-script-reading-flow min-h-[360px] max-w-4xl p-5 text-[15px] leading-7 text-zinc-200 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_mark]:rounded [&_mark]:bg-yellow-300 [&_mark]:px-0.5 [&_p]:mb-4 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: scriptHtml }}
          />
          </div>
        </Surface>
      )}

      {discoveryQuestions.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3" data-testid="script-discovery-questions">
          <div className="flex items-center gap-2">
            <CircleHelp className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Discovery questions</h3>
              <p className="mt-0.5 text-[10px] text-zinc-500">Ask while you listen — in this order</p>
            </div>
          </div>
          <ol className="mt-2 space-y-1.5">
            {discoveryQuestions.map((question) => (
              <li key={question} className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-300">
                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" aria-hidden="true" />
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Stick to this approved wording — never diagnose or promise treatment.
      </div>
      </section>
    </Surface>
  );
}
