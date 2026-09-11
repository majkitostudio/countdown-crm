"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Type } from "lucide-react";
import { getProductScriptAction } from "@/app/actions/productScripts";
import { Product } from "@/lib/products";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";
import type { ScriptSnapshotDTO } from "@/lib/dal/productScripts";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  activeSnapshot?: ScriptSnapshotDTO | null;
}

export function ProductScriptPanel({ product, isCallActive, activeSnapshot = null }: ProductScriptPanelProps) {
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
    <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 shadow-sm backdrop-blur-md" data-testid="operator-script-context" aria-labelledby="product-script-title">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300">
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 id="product-script-title" className="text-sm font-semibold text-zinc-100">Product Script</h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                Continuous script
              </span>
            </div>
            <p className="text-xs text-zinc-300">{activeSnapshot?.productTitle || product?.title || "Select a product"} · read top to bottom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2 py-1 text-[10px] font-mono ${isCallActive ? "border-emerald-800/80 bg-emerald-950/30 text-emerald-300" : "border-zinc-800 text-zinc-500"}`}>
            {isCallActive ? "Active" : "Ready"}
          </span>
        </div>
      </div>

      {activeSnapshot?.source === "published_version" && (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-[10px] leading-relaxed text-emerald-200/80">
          Version {activeSnapshot.versionNumber} captured for this call
        </p>
      )}
      {activeSnapshot?.source === "built_in_fallback" && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-[10px] leading-relaxed text-zinc-400">Built-in fallback captured for this call</p>
      )}
      {activeSnapshot?.source === "unavailable" && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200/80">No script was captured for this call.</p>
      )}

      {scriptLoadError && <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-200">{scriptLoadError}</p>}
      {scriptStatus === "not_found" && <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">No saved script for this product — showing the built-in fallback.</p>}
      {isLoadingScript && <p className="text-[11px] text-zinc-400">Checking for the latest approved script…</p>}

      {scriptStatus !== "error" && (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/40 [scrollbar-color:theme(colors.zinc.700)_transparent] [scrollbar-width:thin]">
          <div
            className="operator-script-reading-flow min-h-[360px] max-w-4xl p-5 text-[15px] leading-7 text-zinc-200 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_mark]:rounded [&_mark]:bg-yellow-300 [&_mark]:px-0.5 [&_p]:mb-4 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: scriptHtml }}
          />
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Stick to this approved wording — never diagnose or promise treatment.
      </div>
    </section>
  );
}
