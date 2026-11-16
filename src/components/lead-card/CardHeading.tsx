import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section heading inside a lead card. `PageHeader` owns the page `<h1>`,
 * so every card title on the customer card is an `<h2>`.
 */
export function CardHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-heading text-sm font-medium leading-snug text-text-primary", className)}>
      {children}
    </h2>
  );
}

/** Sub-heading inside a card section. */
export function CardSubHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wider text-text-muted",
        className,
      )}
    >
      {children}
    </h3>
  );
}
