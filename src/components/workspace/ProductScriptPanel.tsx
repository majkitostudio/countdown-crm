"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, CircleHelp, Maximize2, MessageSquareQuote, Minimize2, ShieldAlert, ShieldCheck, Type } from "lucide-react";
import { getProductScriptAction } from "@/app/actions/productScripts";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { Product } from "@/lib/products";
import { getProductScript } from "@/lib/productScripts";
import { buildDefaultScriptHtml } from "@/lib/scriptContent";
import type { ScriptSnapshotDTO } from "@/lib/dal/productScripts";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ProductScriptPanelProps {
  product?: Product;
  isCallActive: boolean;
  activeSnapshot?: ScriptSnapshotDTO | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onOpenObjections?: () => void;
  discoveryQuestions?: string[];
}

export function ProductScriptPanel({
  product,
  isCallActive,
  activeSnapshot = null,
  isExpanded = false,
  onToggleExpand,
  onOpenObjections,
  discoveryQuestions = [],
}: ProductScriptPanelProps) {
  const [selectedQuickObjectionId, setSelectedQuickObjectionId] = useState<string | null>(null);

  const quickObjections = useMemo(() => {
    const script = getProductScript(product);
    const scriptResponses = script.objectionResponses || {};
    return [
      {
        id: "price",
        label: "Drahé / Cena",
        title: "Námitka: Vysoká cena / „Nemám peníze“",
        response:
          scriptResponses.price ||
          "Naprosto vám rozumím. Pojďme se nejprve ujistit, zda vám produkt skutečně vyřeší potíže, a pak společně projdeme možnosti a zvýhodněné ceny.",
      },
      {
        id: "effectiveness",
        label: "Nevěřím účinku",
        title: "Námitka: Nedůvěra / „Nevěřím, že to pomůže“",
        response:
          scriptResponses.effectiveness ||
          "Chápu vaši otázku. Mohu vám vysvětlit schválené složení a jak přípravek v těle působí, ale nechci vám slibovat zázraky, které nelze garantovat.",
      },
      {
        id: "hesitation",
        label: "Chci čas / Porada",
        title: "Námitka: Váhání / „Musím si to promyslet“",
        response:
          scriptResponses.hesitation ||
          "To je samozřejmě rozumné. Jaké další informace by vám pomohly udělat pro sebe příjemné a pohodlné rozhodnutí?",
      },
      {
        id: "delivery",
        label: "Doprava / Doručení",
        title: "Námitka: Poštovné a doručení",
        response:
          scriptResponses.delivery ||
          "Rád vám potvrdím cenu dopravy i přesný termín doručení na vaši adresu ještě předtím, než budeme pokračovat.",
      },
    ];
  }, [product]);

  const activeQuickObjection = useMemo(() => {
    if (!selectedQuickObjectionId) return null;
    return quickObjections.find((item) => item.id === selectedQuickObjectionId) || null;
  }, [quickObjections, selectedQuickObjectionId]);
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
          {isExpanded && onOpenObjections && (
            <Button
              variant="secondary"
              onClick={onOpenObjections}
              aria-label="Open objection catalog"
              title="Open objection catalog"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              Katalog námitek
            </Button>
          )}
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
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Discovery questions</h3>
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

      {!isExpanded && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3" data-testid="script-quick-objections">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Rychlé námitky</h3>
                <p className="mt-0.5 text-[10px] text-zinc-500">Schválené odpovědi do telefonu pro okamžitou reakci</p>
              </div>
            </div>
            {selectedQuickObjectionId && (
              <button
                type="button"
                onClick={() => setSelectedQuickObjectionId(null)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Zavřít
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {quickObjections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedQuickObjectionId((prev) => (prev === item.id ? null : item.id))}
                className={cn(
                  "flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedQuickObjectionId === item.id
                    ? "border-zinc-500 bg-zinc-800 text-zinc-100 shadow-sm ring-1 ring-zinc-500/30"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                )}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {activeQuickObjection && (
            <div className="mt-2.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 text-xs text-zinc-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-xs font-medium text-zinc-200">
                <span>{activeQuickObjection.title}</span>
                <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">Battle-card</span>
              </div>
              <p className="mt-2 leading-relaxed text-zinc-200">
                {activeQuickObjection.response}
              </p>
            </div>
          )}
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
