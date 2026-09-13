import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { getSafeLayoutClassName } from "@/components/ui/Surface";

export type SemanticTone = "neutral" | "info" | "success" | "warning" | "danger" | "blocked";

const STATUS_CLASS_NAMES: Record<SemanticTone, string> = {
  neutral: "border-status-neutral-border bg-status-neutral text-status-neutral-text",
  info: "border-status-info-border bg-status-info text-status-info-text",
  success: "border-status-success-border bg-status-success text-status-success-text",
  warning: "border-status-warning-border bg-status-warning text-status-warning-text",
  danger: "border-status-danger-border bg-status-danger text-status-danger-text",
  blocked: "border-status-blocked-border bg-status-blocked text-status-blocked-text",
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
