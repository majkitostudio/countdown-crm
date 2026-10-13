"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TEAM_WORKSPACE_TABS = [
  { href: "/team", label: "Team Overview" },
  { href: "/team/exceptions", label: "Exceptions" },
  { href: "/team/reviews", label: "Training Reviews" },
] as const;

/**
 * Top-level navigation for the Team Workspace area. Exceptions and Training
 * Reviews used to be standalone sidebar entries; they now live as sibling tabs
 * so Team Leaders run teams, exception queue and reviews from one destination.
 */
export function TeamWorkspaceTabs() {
  const pathname = usePathname();

  // A nested tab (/team/exceptions) must win over its parent (/team), so the
  // active tab is the longest matching href, not the first prefix match.
  const activeHref = pathname
    ? [...TEAM_WORKSPACE_TABS]
        .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href
    : undefined;

  return (
    <nav aria-label="Team Workspace sections" className="flex flex-wrap items-center gap-2">
      {TEAM_WORKSPACE_TABS.map((tab) => {
        const isActive = tab.href === activeHref;
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
