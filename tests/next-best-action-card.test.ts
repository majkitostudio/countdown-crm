import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/nextBestAction", () => ({ loadNextBestActionAction: vi.fn() }));

import { NextBestActionContent } from "@/components/dashboard/NextBestActionCard";
import type { NextBestActionState } from "@/lib/nextBestAction";

function render(state: NextBestActionState): string {
  return renderToStaticMarkup(React.createElement(NextBestActionContent, { state }));
}

describe("next best action presentation states", () => {
  it("shows a partial reorder with the scheduled call warning", () => {
    const html = render({
      status: "partial",
      action: {
        kind: "reorder",
        title: "Doplnit objednávku: Petr Svoboda",
        description: "Test product • odhad spotřeby za 1 dní.",
        href: "/console?leadId=lead-2",
        source: "re-order estimate",
        source_id: "reorder-1",
      },
      unavailableSources: ["scheduledCalls"],
      message: "Naplánované hovory nejsou dostupné. Zkuste to znovu později.",
    });

    expect(html).toContain("Doplnit objednávku: Petr Svoboda");
    expect(html).toContain('href="/console?leadId=lead-2"');
    expect(html).toContain("Naplánované hovory nejsou dostupné. Zkuste to znovu později.");
    expect(html).toContain("Částečné doporučení");
  });

  it("shows a partial scheduled call with the reorder warning", () => {
    const html = render({
      status: "partial",
      action: {
        kind: "scheduled_call",
        title: "Navázat na naplánovaný hovor: Jana Nováková",
        description: "Naplánovaný hovor za 60 min.",
        href: "/console?leadId=lead-1",
        source: "scheduled call",
        source_id: "scheduled-call-1",
      },
      unavailableSources: ["reorders"],
      message: "Odhady opakovaných objednávek nejsou dostupné. Zkuste to znovu později.",
    });

    expect(html).toContain("Navázat na naplánovaný hovor: Jana Nováková");
    expect(html).toContain("Odhady opakovaných objednávek nejsou dostupné. Zkuste to znovu později.");
  });

  it("does not render an action link when priority is unavailable", () => {
    const html = render({
      status: "unavailable",
      unavailableSources: ["scheduledCalls", "reorders"],
      message: "Prioritní signály nejsou dostupné.",
    });

    expect(html).toContain("Prioritní signály nejsou dostupné.");
    expect(html).not.toContain("Open action");
    expect(html).not.toContain("href=");
  });

  it("renders a verified queue fallback without a partial warning", () => {
    const html = render({
      status: "ready",
      action: {
        kind: "queue",
        title: "Claim next lead",
        description: "Nejsou k dispozici urgentní naplánované hovory ani re-order odhady.",
        href: "/console",
        source: "lead queue",
        source_id: null,
      },
    });

    expect(html).toContain("Claim next lead");
    expect(html).toContain('href="/console"');
    expect(html).not.toContain("Částečné doporučení");
  });
});
