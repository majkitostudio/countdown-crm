import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Surface, getSurfaceClassName } from "@/components/ui/Surface";
import { StatusBadge, getStatusClassName } from "@/components/ui/Status";
import { MetricCard } from "@/components/ui/MetricCard";

describe("shared operator console design primitives", () => {
  it("uses one fixed page-surface recipe", () => {
    expect(getSurfaceClassName("page")).toBe(
      "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm"
    );
    expect(renderToStaticMarkup(<Surface variant="page">Orders</Surface>)).toContain("bg-zinc-900/60");
  });

  it("keeps ordinary status and metric content neutral", () => {
    expect(getStatusClassName("neutral")).toContain("text-zinc-300");
    expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
    expect(renderToStaticMarkup(<MetricCard label="Orders" value="24" />)).toContain("text-zinc-100");
  });

  it("gives every semantic state one shared recipe", () => {
    expect(getStatusClassName("success")).toBe("border-emerald-800/50 bg-emerald-950/20 text-emerald-200");
    expect(getStatusClassName("warning")).toBe("border-amber-800/50 bg-amber-950/20 text-amber-200");
    expect(getStatusClassName("danger")).toBe("border-rose-800/50 bg-rose-950/20 text-rose-200");
  });
});
