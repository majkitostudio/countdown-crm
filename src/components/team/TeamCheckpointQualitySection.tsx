"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export function TeamCheckpointQualitySection({
  qualityPendingCount,
  qualityAvailable,
  onOpenQuality,
}: { qualityPendingCount: number; qualityAvailable: boolean; onOpenQuality: () => void }) {
  return (
    <Surface variant="page">
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Kvalita hovorů</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                AI kontrola poznámek u reálných hovorů. Doporučení ke kontrole pro Team Leadera.
              </p>
            </div>
          </div>
          <StatusBadge tone={qualityPendingCount > 0 ? "warning" : "neutral"}>
            {qualityAvailable
              ? qualityPendingCount > 0
                ? `${qualityPendingCount} ke kontrole`
                : "bez nálezů"
              : "nedostupná"}
          </StatusBadge>
        </div>

        {!qualityAvailable ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
            AI kontrola kvality není dostupná.
          </p>
        ) : qualityPendingCount === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center text-xs text-zinc-500">
            Všechna zpracovaná hovora vypadají v pořádku.
          </p>
        ) : (
          <p className="text-xs text-zinc-400">
            {qualityPendingCount === 1 ? "1 hovor" : `${qualityPendingCount} hovory`} doporučené k ruční kontrole.
          </p>
        )}

        <Button variant="secondary" onClick={onOpenQuality}>
          Otevřít Kontrolu kvality hovorů <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Surface>
  );
}