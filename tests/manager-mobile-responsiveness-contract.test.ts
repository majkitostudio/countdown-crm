import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Manager mobile and tablet responsiveness contract (Phase 7)", () => {
  it("ensures Dashboard page uses responsive layouts for mobile and tablet screens", () => {
    const dashboard = readSource("src/app/reports/page.tsx");
    const kpiCards = readSource("src/components/dashboard/KpiCards.tsx");

    // Dashboard grid stacks on small screens and expands on large
    expect(dashboard).toContain("grid grid-cols-1 gap-6");
    expect(dashboard).toContain("lg:grid-cols-3");

    // Compact KPI cards stack on phones so multi-currency totals remain readable.
    expect(kpiCards).toContain('grid grid-cols-1 gap-3 ${compact ? "sm:grid-cols-2"');
  });

  it("ensures Team Workspace accommodates mobile viewports with horizontal scroll tabs", () => {
    const teamContent = readSource("src/components/team/TeamPageContent.tsx");

    // View tabs scroll horizontally on small mobile screens
    expect(teamContent).toContain("overflow-x-auto");
    expect(teamContent).toContain("min-w-max");

    // Context bar stacks vertically on mobile and horizontally on sm+
    expect(teamContent).toContain("flex flex-col gap-3");
    expect(teamContent).toContain("sm:flex-row sm:items-center");
    expect(teamContent).toContain('role="tabpanel"');
    expect(teamContent).toContain('event.key === "ArrowRight"');
    expect(teamContent).toContain("tabIndex={selected ? 0 : -1}");
  });

  it("defaults mobile order views to the table and supports keyboard scrolling in Kanban", () => {
    const pipeline = readSource("src/components/orders/OrderPipeline.tsx");
    const kanban = readSource("src/components/orders/OrderKanban.tsx");

    expect(pipeline).toContain('window.matchMedia("(max-width: 639px)")');
    expect(pipeline).toContain('viewport.matches ? "table" : initialViewMode');
    expect(kanban).toContain('aria-label="Sloupce stavů objednávek"');
    expect(kanban).toContain('event.key === "ArrowRight"');
    expect(kanban).toContain('event.key === "Home"');
    expect(kanban).toContain('event.key === "End"');
  });

  it("allows the shared status footer to wrap on narrow screens", () => {
    const appShell = readSource("src/components/layout/AppShell.tsx");

    expect(appShell).toContain("min-h-8 h-auto flex-wrap");
    expect(appShell).toContain("px-3 py-2");
    expect(appShell).toContain("sm:px-6 sm:py-0");
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
