import type { ComponentPropsWithoutRef } from "react";

export type SurfaceVariant = "page" | "inset" | "table" | "empty" | "overlay";

const SURFACE_CLASS_NAMES: Record<SurfaceVariant, string> = {
  page: "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm",
  inset: "rounded-xl border border-zinc-800/80 bg-zinc-950/60",
  table: "overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm",
  empty: "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-12 text-center shadow-sm",
  overlay: "rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl",
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
