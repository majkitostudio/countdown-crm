"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

type BulkActionPanelProps = {
  selectedCount: number;
  onClear: () => void;
  children?: ReactNode;
};

/** The caller supplies actions and controls their availability. */
export function BulkActionPanel({ selectedCount, onClear, children }: BulkActionPanelProps) {
  return (
    <Surface variant="inset" className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-xs font-semibold text-text-primary">
            Vybrané položky: <span className="font-mono tabular-nums">{selectedCount}</span>
          </span>
          <Button variant="quiet" onClick={onClear} disabled={selectedCount === 0}>
            Zrušit výběr
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </Surface>
  );
}
