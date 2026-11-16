import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The feed loads later pages through a server action; rendering the first page
// statically only needs the module graph to resolve.
vi.mock("server-only", () => ({}));

import { CustomerTimelineFeed } from "@/components/lead-card/CustomerTimelineFeed";
import type { TimelineActivityEntry } from "@/lib/timeline";

function localDay(dayOffset: number, hours: number, minutes = 0): string {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() - dayOffset);
  return date.toISOString();
}

const CALL: TimelineActivityEntry = {
  id: "call-1",
  lead_id: "lead-1",
  type: "call",
  title: "Hovor zaznamenán v pracovním prostoru",
  operator_name: "Operátor Jan",
  timestamp: localDay(0, 10, 30),
  metadata: { call_duration_seconds: 425, call_outcome: "completed" },
};

const ORDER: TimelineActivityEntry = {
  id: "order-1",
  lead_id: "lead-1",
  type: "order",
  title: "Objednávka zaznamenána (1250.00 CZK)",
  operator_name: "Operátor Jan",
  timestamp: localDay(1, 9, 15),
  metadata: { order_id: "8f2c1d30-0000-0000-0000-000000000000", order_value: 1250, order_currency: "CZK" },
};

const NOTE: TimelineActivityEntry = {
  id: "note-1",
  lead_id: "lead-1",
  type: "note",
  title: "Poznámka operátora",
  description: "Zákazník chce zvýšení dávky.",
  operator_name: "Vedoucí Petra",
  timestamp: localDay(1, 8, 5),
};

function render(props: Partial<ComponentProps<typeof CustomerTimelineFeed>> = {}) {
  return renderToStaticMarkup(createElement(CustomerTimelineFeed, {
    leadId: "lead-1",
    initialItems: [CALL, ORDER, NOTE],
    initialNextCursor: "cursor-2",
    initialHasMore: true,
    ...props,
  }));
}

describe("Customer timeline feed", () => {
  it("groups the merged activity by day, newest first", () => {
    const markup = render();

    expect(markup).toContain('data-testid="customer-timeline-feed"');
    expect(markup).toContain("Historie zákazníka");
    expect(markup).toContain('aria-label="Dnes"');
    expect(markup).toContain('aria-label="Včera"');
    expect(markup.indexOf("Hovor zaznamenán")).toBeLessThan(markup.indexOf("Poznámka operátora"));
  });

  it("shows structured details instead of a prose preview", () => {
    const markup = render();

    expect(markup).toContain("Délka");
    expect(markup).toContain("Zaznamenal: Operátor Jan");
    expect(markup).toContain("Zákazník chce zvýšení dávky.");
    expect(markup).toMatch(/1[\s\u00a0\u202f]250,00 CZK/);
    expect(markup).toContain("Objednávka zaznamenána");
    expect(markup).not.toContain("1250.00 CZK");
    expect(markup).toContain('href="/orders/8f2c1d30-0000-0000-0000-000000000000?origin=lead"');
    expect(markup).toContain("Detail objednávky");
    expect(markup).not.toContain("• Nálada:");
  });

  it("shows missing currency as CZK and preserves an explicitly stored currency", () => {
    const withoutCurrency = render({ initialItems: [{ ...ORDER, metadata: { order_value: 1250 } }] });
    const euros = render({ initialItems: [{ ...ORDER, metadata: { order_value: 1250, order_currency: "EUR" } }] });

    expect(withoutCurrency).toMatch(/1[\s\u00a0\u202f]250,00 CZK/);
    expect(withoutCurrency).not.toContain("USD");
    expect(euros).toMatch(/1[\s\u00a0\u202f]250,00[\s\u00a0\u202f]*€/);
  });

  it("offers the activity filters as a toggle group", () => {
    const markup = render();

    expect(markup).toContain('aria-label="Filtr časové osy"');
    for (const label of ["Vše", "Hovory", "Objednávky", "Poznámky"]) {
      expect(markup).toContain(label);
    }
  });

  it("pages with the cursor and reports the loading region", () => {
    const markup = render();

    expect(markup).toContain("Načíst další záznamy");
    expect(markup).toContain('aria-busy="false"');
    expect(markup).toContain('aria-live="polite"');

    expect(render({ initialNextCursor: null, initialHasMore: false })).not.toContain("Načíst další záznamy");
  });

  it("states honestly when the customer has no activity yet", () => {
    const markup = render({ initialItems: [], initialNextCursor: null, initialHasMore: false });

    expect(markup).toContain("Zákazník zatím nemá žádnou aktivitu");
    expect(markup).not.toContain("Načíst další záznamy");
  });

  it("keeps a retry path when the first page cannot be loaded", () => {
    const markup = render({
      initialItems: [],
      initialNextCursor: null,
      initialHasMore: false,
      initialError: "Historie není dostupná.",
    });

    expect(markup).toContain("Historie není dostupná.");
    expect(markup).toContain("Zkusit znovu");
    expect(markup).not.toContain("Zákazník zatím nemá žádnou aktivitu");
  });

  it("announces a failed page load without discarding what is already on screen", () => {
    const markup = render({ initialError: "Další aktivitu se nepodařilo načíst." });

    expect(markup).toContain("Další aktivitu se nepodařilo načíst.");
    expect(markup).toContain("Hovor zaznamenán");
    expect(markup).not.toContain("Zkusit znovu");
  });
});
