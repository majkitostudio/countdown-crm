import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownMarkProps {
  className?: string;
}

/** The application mark: Lucide's Gauge with an amber needle overlay. */
export function CountdownMark({ className }: CountdownMarkProps) {
  return (
    <span aria-hidden="true" className={cn("relative inline-block h-6 w-6 shrink-0", className)}>
      <Gauge
        className="absolute inset-0 h-full w-full text-zinc-100"
        strokeWidth={2}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="m12 14 4-4"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
