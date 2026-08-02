"use client";

import React from "react";
import { Table, Kanban } from "lucide-react";

export type ViewMode = "table" | "kanban";

interface ViewSwitcherProps {
  mode: ViewMode;
  onModeChange: (newMode: ViewMode) => void;
}

export function ViewSwitcher({ mode, onModeChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex items-center p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl">
      <button
        onClick={() => onModeChange("table")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
          mode === "table"
            ? "bg-zinc-800 text-zinc-100 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Table className="w-3.5 h-3.5" />
        <span>Table View</span>
      </button>

      <button
        onClick={() => onModeChange("kanban")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
          mode === "kanban"
            ? "bg-zinc-800 text-zinc-100 shadow-xs"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Kanban className="w-3.5 h-3.5" />
        <span>Kanban Board</span>
      </button>
    </div>
  );
}
