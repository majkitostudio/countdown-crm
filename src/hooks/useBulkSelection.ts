"use client";

import { useState } from "react";

/**
 * Selection persists across filtered views. Pass only the IDs currently
 * visible to toggleVisible; clearing stale IDs is the caller's responsibility.
 */
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible(ids: readonly string[]) {
    setSelectedIds((previous) => {
      const visible = new Set(ids);
      if (visible.size === 0) return previous;
      const allSelected = Array.from(visible).every((id) => previous.has(id));
      const next = new Set(previous);
      for (const id of visible) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function clear() {
    setSelectedIds(new Set());
  }

  function getVisibleState(ids: readonly string[]) {
    const visible = new Set(ids);
    let selected = 0;
    for (const id of visible) {
      if (selectedIds.has(id)) selected += 1;
    }
    return {
      allSelected: visible.size > 0 && selected === visible.size,
      partiallySelected: selected > 0 && selected < visible.size,
    };
  }

  return { selectedIds, selectedCount: selectedIds.size, toggle, toggleVisible, clear, getVisibleState };
}
