"use client";

import { useEffect, useState } from "react";
import { ChevronRight, CircleHelp, Maximize2, Minimize2, ShieldAlert, ShieldCheck, Type } from "lucide-react";
import Link from "next/link";
import { getCallScriptSnapshotAction } from "@/app/actions/productScripts";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { Product } from "@/lib/products";
import type { ScriptSnapshotDTO } from "@/lib/dal/productScripts";
import { Button } from "@/components/ui/Button";

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
  const [scriptResource, setScriptResource] = useState<{
    productId: string | null;
    html: string | null;
    status: "idle" | "loading" | "ready" | "not_found" | "error";
    error: string | null;
  }>({ productId: null, html: null, status: "idle", error: null });
  const currentProductId = product?.id || null;
  const hasCurrentScriptResource = scriptResource.productId === currentProductId;
  const persistedHtml = hasCurrentScriptResource ? scriptResource.html : null;
  const scriptStatus = activeSnapshot ? "ready" : hasCurrentScriptResource ? scriptResource.status : "loading";
  const scriptLoadError = activeSnapshot ? null : hasCurrentScriptResource ? scriptResource.error : null;
  const isLoadingScript = Boolean(currentProductId) && scriptStatus === "loading";
  const scriptHtml = activeSnapshot?.source === "published_version"
    ? activeSnapshot.html
    : persistedHtml || "";
  const scriptTitle = activeSnapshot?.productTitle || product?.title || "Produktový skript";
  useEffect(() => {
    let cancelled = false;
    if (activeSnapshot) return () => {
      cancelled = true;
    };
    const productId = product?.id;
    if (!productId) return () => {
      cancelled = true;
    };

    void getCallScriptSnapshotAction(productId)
      .then((snapshot) => {
        if (!cancelled) {
          setScriptResource({
            productId,
            html: snapshot.source === "published_version" ? snapshot.html : null,
            status: snapshot.source === "published_version" ? "ready" : "not_found",
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
            error: "Schválený skript není dostupný. Žádný uložený skript se nezobrazuje.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSnapshot, product?.id]);

  return (
    <Surface variant="page" className="w-full" data-testid="operator-script-context" aria-labelledby="product-script-title">
      <section className="flex flex-col min-h-0 space-y-4 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300">
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 id="product-script-title" className="text-sm font-semibold text-zinc-100">Produktový skript</h2>
              <StatusBadge tone="neutral">
                Souvislý skript
              </StatusBadge>
            </div>
            <p className="text-xs text-zinc-300">{scriptTitle} · čtěte shora dolů</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral">
            {isCallActive ? "Aktivní" : "Připraveno"}
          </StatusBadge>
          {isExpanded && onOpenObjections && (
            <Button
              variant="secondary"
              onClick={onOpenObjections}
              aria-label="Otevřít katalog námitek"
              title="Otevřít katalog námitek"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              Katalog námitek
            </Button>
          )}
          {onToggleExpand && (
            <Button
              variant="secondary"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Sbalit skript" : "Rozbalit skript"}
              title={isExpanded ? "Sbalit skript" : "Rozbalit skript"}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {isExpanded ? "Sbalit" : "Rozbalit"}
            </Button>
          )}
        </div>
      </div>

      {activeSnapshot?.source === "published_version" && (
        <StatusAlert tone="success" className="w-full">
          Pro tento hovor byla zachycena verze {activeSnapshot.versionNumber}
        </StatusAlert>
      )}
      {activeSnapshot?.source === "built_in_fallback" && (
        <StatusAlert tone="neutral" className="w-full">Pro tento hovor byla zachycena vestavěná náhradní verze</StatusAlert>
      )}
      {activeSnapshot?.source === "unavailable" && (
        <StatusAlert tone="warning" className="w-full">Pro tento hovor nebyl zachycen žádný skript.</StatusAlert>
      )}

      {scriptLoadError && <StatusAlert tone="warning" className="w-full">{scriptLoadError}</StatusAlert>}
      {scriptStatus === "not_found" && (
        <StatusAlert tone="warning" className="w-full">
          Pro tento produkt není publikovaný schválený skript. Hovor nelze zahájit.
          {" "}<Link href="/products" className="font-medium underline underline-offset-2">Otevřít správu produktů a skriptů</Link>
        </StatusAlert>
      )}
      {isLoadingScript && <p className="text-[11px] text-zinc-400">Kontrola nejnovějšího schváleného skriptu…</p>}

      {scriptHtml && scriptStatus !== "error" && (
        <Surface variant="inset" className="w-full flex-1 min-h-0">
          <div className="h-full min-h-0 overflow-y-auto [scrollbar-color:theme(colors.zinc.700)_transparent] [scrollbar-width:thin]">
          <div
            className="operator-script-reading-flow min-h-[360px] max-w-4xl p-5 text-[15px] leading-7 text-zinc-200 [&_hr]:my-6 [&_hr]:border-zinc-700 [&_mark]:rounded [&_mark]:bg-amber-500/20 [&_mark]:text-amber-200 [&_mark]:border [&_mark]:border-amber-500/30 [&_mark]:px-1 [&_mark]:font-medium [&_p]:mb-4 [&_p:last-child]:mb-0"
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
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Zjišťovací otázky</h3>
              <p className="mt-0.5 text-[10px] text-zinc-500">Ptejte se při naslouchání — v tomto pořadí</p>
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

      {scriptHtml && scriptStatus !== "error" && (
      <div className="mt-auto flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Držte se tohoto schváleného znění; nediagnostikujte ani neslibujte léčbu.
      </div>
      )}
      </section>
    </Surface>
  );
}
