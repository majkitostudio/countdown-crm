import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderPipeline } from "@/components/orders/OrderPipeline";
import { StatusBadge } from "@/components/ui/Status";

describe("daily operator route rendering", () => {
  it("renders the orders filter as accessible shared buttons while keeping normal order status neutral", () => {
    const markup = renderToStaticMarkup(<OrderPipeline orders={[]} />);

    expect(markup).toContain("No matching orders");
    expect(markup).toContain("focus-visible:ring-2");
    expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
  });
});
