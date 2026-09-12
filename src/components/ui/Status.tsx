import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { getSafeLayoutClassName } from "@/components/ui/Surface";

export type SemanticTone = "neutral" | "success" | "warning" | "danger";

const STATUS_CLASS_NAMES: Record<SemanticTone, string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
  success: "border-emerald-800/50 bg-emerald-950/20 text-emerald-200",
  warning: "border-amber-800/50 bg-amber-950/20 text-amber-200",
  danger: "border-rose-800/50 bg-rose-950/20 text-rose-200",
};

export function getStatusClassName(tone: SemanticTone): string {
  return STATUS_CLASS_NAMES[tone];
}

export type StatusBadgeProps = Omit<ComponentPropsWithoutRef<"span">, "className" | "style"> & {
  tone?: SemanticTone;
  className?: string;
  style?: never;
};

export function StatusBadge({ tone = "neutral", className, style: _style, ...props }: StatusBadgeProps) {
  void _style;
  return <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium", getStatusClassName(tone), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
}

export type StatusAlertProps = Omit<ComponentPropsWithoutRef<"div">, "className" | "style"> & {
  tone?: SemanticTone;
  className?: string;
  style?: never;
};

export const StatusAlert = forwardRef<HTMLDivElement, StatusAlertProps>(function StatusAlert({ tone = "neutral", className, style: _style, role, ...props }, ref) {
  void _style;
  return <div ref={ref} role={role ?? "alert"} className={["rounded-xl border p-4 text-sm", getStatusClassName(tone), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
});
