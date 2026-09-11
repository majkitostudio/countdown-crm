import type { ComponentPropsWithoutRef } from "react";

export type SurfaceVariant = "page" | "inset" | "table" | "empty" | "overlay";

const SURFACE_CLASS_NAMES: Record<SurfaceVariant, string> = {
  page: "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm",
  inset: "rounded-xl border border-zinc-800/80 bg-zinc-950/60",
  table: "overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm",
  empty: "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-12 text-center shadow-sm",
  overlay: "rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl",
};

export function getSurfaceClassName(variant: SurfaceVariant): string {
  return SURFACE_CLASS_NAMES[variant];
}

export type SurfaceProps = ComponentPropsWithoutRef<"div"> & {
  variant: SurfaceVariant;
};

export function Surface({ variant, className, ...props }: SurfaceProps) {
  return <div className={[getSurfaceClassName(variant), className].filter(Boolean).join(" ")} {...props} />;
}
