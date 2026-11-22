"use client";

import { Volume2 } from "lucide-react";

interface RemoteVolumeControlProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function RemoteVolumeControl({ value, onChange, className = "" }: RemoteVolumeControlProps) {
  return (
    <label className={`inline-flex min-w-0 items-center gap-2 text-zinc-300 ${className}`}>
      <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
      <span className="sr-only">Hlasitost zákazníka</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Hlasitost zákazníka"
        title={`Hlasitost zákazníka: ${value} %`}
        className="h-2 w-20 cursor-pointer accent-sky-300 sm:w-24"
      />
      <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums">{value}%</span>
    </label>
  );
}
