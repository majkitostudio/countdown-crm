import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import type { SemanticTone } from "@/components/ui/Status";

const METRIC_VALUE_CLASS_NAMES: Record<SemanticTone, string> = {
  neutral: "text-zinc-100",
  success: "text-emerald-200",
  warning: "text-amber-200",
  danger: "text-rose-200",
};

export function getMetricValueClassName(tone: SemanticTone = "neutral"): string {
  return METRIC_VALUE_CLASS_NAMES[tone];
}

export type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  valueTone?: SemanticTone;
  detail?: ReactNode;
  className?: string;
  style?: never;
};

export function MetricCard({ label, value, valueTone = "neutral", detail, className }: MetricCardProps) {
  return (
    <Surface variant="inset" className={className}>
      <div className="p-4">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className={["mt-2 text-2xl font-semibold tracking-tight", getMetricValueClassName(valueTone)].join(" ")}>{value}</p>
        {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
      </div>
    </Surface>
  );
}
