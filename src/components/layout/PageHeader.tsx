import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageHeaderBadgeTone = "neutral" | "success" | "warning" | "unavailable";

export interface PageHeaderBadge {
  label: ReactNode;
  tone?: PageHeaderBadgeTone;
}

export interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  badge?: PageHeaderBadge;
  backLink?: {
    href: string;
    label: string;
  };
  actions?: ReactNode;
  className?: string;
}

const BADGE_TONE_CLASSES: Record<PageHeaderBadgeTone, string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
  success: "border-emerald-800/70 bg-emerald-950/50 text-emerald-300",
  warning: "border-amber-800/70 bg-amber-950/50 text-amber-300",
  unavailable: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function getPageHeaderBadgeClassName(tone: PageHeaderBadgeTone = "neutral"): string {
  return BADGE_TONE_CLASSES[tone];
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  backLink,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 p-6 shadow-sm sm:p-8 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {backLink && (
          <Link
            href={backLink.href}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {backLink.label}
          </Link>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h1 className="flex min-w-0 items-center gap-2.5 break-words text-xl font-semibold tracking-tight text-zinc-100">
            <Icon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
            <span>{title}</span>
          </h1>
          {badge && (
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono",
                getPageHeaderBadgeClassName(badge.tone)
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
        {description && <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">{description}</p>}
      </div>

      {actions && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">{actions}</div>}
    </header>
  );
}
