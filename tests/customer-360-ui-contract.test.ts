import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Customer360RetentionCard } from "@/components/leads/Customer360RetentionCard";

describe("Customer 360 UI contract", () => {
  it("renders persisted activity without fabricating a retention action", () => {
    const markup = renderToStaticMarkup(createElement(Customer360RetentionCard, {
      lead: { id: "lead-1", full_name: "Customer One" } as never,
      activity: { calls: [], orders: [] },
      activityUnavailable: true,
    }));

    expect(markup).toContain('data-testid="customer-360-retention"');
    expect(markup).toContain("Persisted workspace data");
    expect(markup).toContain("Customer activity is unavailable");
    expect(markup).not.toContain("Next retention action");
  });
});
