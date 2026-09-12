"use client";

import React from "react";
import { Table, Kanban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export type ViewMode = "table" | "kanban";

interface ViewSwitcherProps {
  mode: ViewMode;
  onModeChange: (newMode: ViewMode) => void;
}

export function ViewSwitcher({ mode, onModeChange }: ViewSwitcherProps) {
  return (
    <Surface variant="inset">
      <div className="inline-flex items-center gap-1 p-1">
      <Button
        variant={mode === "table" ? "primary" : "quiet"}
        onClick={() => onModeChange("table")}
      >
        <Table className="w-3.5 h-3.5" />
        <span>Table View</span>
      </Button>

      <Button
        variant={mode === "kanban" ? "primary" : "quiet"}
        onClick={() => onModeChange("kanban")}
      >
        <Kanban className="w-3.5 h-3.5" />
        <span>Kanban Board</span>
      </Button>
      </div>
    </Surface>
  );
}
