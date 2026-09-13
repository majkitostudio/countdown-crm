import type { ComponentPropsWithoutRef } from "react";

export type SurfaceVariant = "page" | "inset" | "table" | "empty" | "overlay";

const SURFACE_CLASS_NAMES: Record<SurfaceVariant, string> = {
  page: "rounded-surface border border-border-default border-t-border-highlight bg-surface-page shadow-sm",
  inset: "rounded-control border border-border-default bg-surface-inset",
  table: "overflow-hidden rounded-surface border border-border-default bg-surface-page shadow-sm",
  empty: "rounded-surface border border-border-default bg-surface-page p-12 text-center shadow-sm",
  overlay: "rounded-overlay border border-border-default bg-surface-overlay shadow-overlay",
};

const SAFE_LAYOUT_CLASS_NAMES = new Set(["w-full"]);

export function getSafeLayoutClassName(className?: string): string {
  return (className ?? "")
    .split(/\s+/)
    .filter((token) => SAFE_LAYOUT_CLASS_NAMES.has(token))
    .join(" ");
}

export function getSurfaceClassName(variant: SurfaceVariant): string {
  return SURFACE_CLASS_NAMES[variant];
}

export type SurfaceProps = Omit<ComponentPropsWithoutRef<"div">, "className" | "style"> & {
  variant: SurfaceVariant;
  className?: string;
  style?: never;
};

export function Surface({ variant, className, style: _style, ...props }: SurfaceProps) {
  void _style;
  return <div className={[getSurfaceClassName(variant), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
}
