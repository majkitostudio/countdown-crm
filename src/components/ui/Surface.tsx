import type { ComponentPropsWithoutRef } from "react";

export type SurfaceVariant = "page" | "inset" | "table" | "empty" | "overlay";

const SURFACE_CLASS_NAMES: Record<SurfaceVariant, string> = {
  page: "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm",
  inset: "rounded-xl border border-zinc-800/80 bg-zinc-950/60",
  table: "overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm",
  empty: "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-12 text-center shadow-sm",
  overlay: "rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl",
};

const PROTECTED_UTILITY_PATTERN = /^(?:bg|text|border|rounded|opacity|shadow|ring|outline|fill|stroke|decoration|accent|caret)(?:-|$)/;
const PROTECTED_ARBITRARY_STYLE_PATTERN = /(?:^|:)!?\[(?:background(?:-color)?|color|border(?:-(?:color|radius|style|width))?|border-radius|opacity|box-shadow|outline(?:-color)?|fill|stroke):/;

export function getSafeLayoutClassName(className?: string): string {
  return (className ?? "")
    .split(/\s+/)
    .filter((token) => {
      const utility = (token.split(":").at(-1) ?? "").replace(/^!/, "");
      return !PROTECTED_UTILITY_PATTERN.test(utility) && !PROTECTED_ARBITRARY_STYLE_PATTERN.test(token);
    })
    .join(" ");
}

export function getSurfaceClassName(variant: SurfaceVariant): string {
  return SURFACE_CLASS_NAMES[variant];
}

export type SurfaceProps = ComponentPropsWithoutRef<"div"> & {
  variant: SurfaceVariant;
};

export function Surface({ variant, className, ...props }: SurfaceProps) {
  return <div className={[getSurfaceClassName(variant), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
}
