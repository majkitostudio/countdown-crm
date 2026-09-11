import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getOrderStatusTone } from "@/components/orders/OrderPipeline";
import { getStatusClassName, StatusBadge } from "@/components/ui/Status";

describe("daily operator route visual contract", () => {
  it("keeps ordinary order status neutral", () => {
    expect(getOrderStatusTone("in_progress")).toBe("neutral");
    expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
  });

  it("keeps an outcome choice semantically distinct", () => {
    expect(getStatusClassName("warning")).toContain("amber-950/20");
    expect(getStatusClassName("danger")).toContain("rose-950/20");
  });
});
