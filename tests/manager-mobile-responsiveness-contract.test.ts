import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Manager mobile and tablet responsiveness contract (Phase 7)", () => {
  it("ensures Dashboard page uses responsive layouts for mobile and tablet screens", () => {
    const dashboard = readSource("src/app/dashboard/page.tsx");
    const kpiCards = readSource("src/components/dashboard/KpiCards.tsx");

    // Dashboard grid stacks on small screens and expands on large
    expect(dashboard).toContain("grid grid-cols-1 gap-6");
    expect(dashboard).toContain("lg:grid-cols-3");

    // KPI cards use two-column compact grid on mobile rather than single-column blowup
    expect(kpiCards).toContain("grid grid-cols-2 gap-3");
  });

  it("ensures Team Workspace accommodates mobile viewports with horizontal scroll tabs", () => {
    const teamContent = readSource("src/components/team/TeamPageContent.tsx");

    // View tabs scroll horizontally on small mobile screens
    expect(teamContent).toContain("overflow-x-auto");
    expect(teamContent).toContain("min-w-max");

    // Context bar stacks vertically on mobile and horizontally on sm+
    expect(teamContent).toContain("flex flex-col gap-3");
    expect(teamContent).toContain("sm:flex-row sm:items-center");
  });

  it("ensures Exception Queue uses flex articles rather than rigid fixed-width tables", () => {
    const exceptionQueue = readSource("src/components/exceptions/ExceptionQueue.tsx");

    // Items flex-stack on mobile/tablet and split on xl screens
    expect(exceptionQueue).toContain("flex flex-col gap-4 xl:flex-row");
    expect(exceptionQueue).toContain("flex-wrap");
  });

  it("ensures PageHeader adapts action buttons seamlessly across screen widths", () => {
    const pageHeader = readSource("src/components/layout/PageHeader.tsx");

    expect(pageHeader).toContain("flex flex-col gap-4 p-4 sm:p-5");
    expect(pageHeader).toContain("md:flex-row md:items-center md:justify-between");
    expect(pageHeader).toContain("flex w-full flex-wrap items-center gap-2");
  });
});
