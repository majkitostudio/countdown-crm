"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Type } from "lucide-react";
import { getProductScriptAction } from "@/app/actions/productScripts";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
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
            <p className="text-xs text-zinc-300">{activeSnapshot?.productTitle || product?.title || "Select a product"} · read top to bottom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="neutral">
            {isCallActive ? "Active" : "Ready"}
          </StatusBadge>
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

      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Stick to this approved wording — never diagnose or promise treatment.
      </div>
      </section>
    </Surface>
  );
}
