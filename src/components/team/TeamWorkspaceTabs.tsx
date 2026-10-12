"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TEAM_WORKSPACE_TABS = [
  { href: "/team", label: "Team Overview" },
  { href: "/training/reviews", label: "Training Reviews" },
] as const;

/**
 * Top-level navigation for the Team Workspace area. "Training Reviews" used to
 * be its own sidebar entry; it now lives as a sibling tab so Team Leaders reach
 * both team management and its training reviews from a single destination.
 */
export function TeamWorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Team Workspace sections" className="flex flex-wrap items-center gap-2">
      {TEAM_WORKSPACE_TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
              isActive
                ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
