import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { Surface, getSurfaceClassName } from "@/components/ui/Surface";
import { StatusAlert, StatusBadge, getStatusClassName } from "@/components/ui/Status";
import { MetricCard, getMetricValueClassName } from "@/components/ui/MetricCard";

const STATUS_RECIPES = [
  ["neutral", "border-zinc-700 bg-zinc-900 text-zinc-300"],
  ["success", "border-emerald-800/50 bg-emerald-950/20 text-emerald-200"],
  ["warning", "border-amber-800/50 bg-amber-950/20 text-amber-200"],
  ["danger", "border-rose-800/50 bg-rose-950/20 text-rose-200"],
] as const;

const SURFACE_RECIPES = [
  ["page", "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm"],
  ["inset", "rounded-xl border border-zinc-800/80 bg-zinc-950/60"],
  ["table", "overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm"],
  ["empty", "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-12 text-center shadow-sm"],
  ["overlay", "rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl"],
] as const;

const BUTTON_RECIPES = [
  ["primary", "bg-zinc-100 text-zinc-950 hover:bg-white"],
  ["secondary", "border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"],
  ["quiet", "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"],
  ["danger", "border border-rose-800/50 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40"],
] as const;

const METRIC_VALUE_RECIPES = [
  ["neutral", "text-zinc-100"],
  ["success", "text-emerald-200"],
  ["warning", "text-amber-200"],
  ["danger", "text-rose-200"],
] as const;

const conflictingRouteClasses = "w-full !bg-fuchsia-500 [background-image:linear-gradient(fuchsia,black)] [border-top-color:fuchsia] hover:[color:fuchsia] [&>*]:bg-fuchsia-500";
const hostileStyleProps = {
  style: {
    backgroundColor: "fuchsia",
    borderTopColor: "fuchsia",
    color: "fuchsia",
    opacity: 0,
  },
} as unknown as Record<string, never>;

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
    const metricMarkup = renderToStaticMarkup(<MetricCard label="Orders" value="24" />);
    expect(metricMarkup).toContain("text-zinc-100");
    expect(metricMarkup).toMatch(/bg-zinc-950\/60"><div class="p-4">/);
  });

  it("gives every semantic state one shared recipe", () => {
    expect(getStatusClassName("success")).toBe("border-emerald-800/50 bg-emerald-950/20 text-emerald-200");
    expect(getStatusClassName("warning")).toBe("border-amber-800/50 bg-amber-950/20 text-amber-200");
    expect(getStatusClassName("danger")).toBe("border-rose-800/50 bg-rose-950/20 text-rose-200");
  });

  it.each(SURFACE_RECIPES)("renders the fixed %s surface recipe", (variant, recipe) => {
    expect(getSurfaceClassName(variant)).toBe(recipe);
    expect(renderToStaticMarkup(<Surface variant={variant}>Orders</Surface>)).toContain(recipe);
  });

  it.each(BUTTON_RECIPES)("renders the fixed %s button recipe and disabled state", (variant, recipe) => {
    expect(getButtonClassName(variant)).toContain(recipe);

    const markup = renderToStaticMarkup(<Button variant={variant} disabled>Save</Button>);

    expect(markup).toContain(recipe);
    expect(markup).toContain("disabled");
  });

  it("uses a safe non-submit button type unless explicitly submitted", () => {
    expect(renderToStaticMarkup(<Button>Save</Button>)).toContain('type="button"');
    expect(renderToStaticMarkup(<Button type="submit">Save</Button>)).toContain('type="submit"');
  });

  it.each(STATUS_RECIPES)("keeps the %s status recipe in badge and alert renderings", (tone, recipe) => {
    expect(getStatusClassName(tone)).toBe(recipe);
    expect(renderToStaticMarkup(<StatusBadge tone={tone}>Current state</StatusBadge>)).toContain(recipe);

    const alertMarkup = renderToStaticMarkup(<StatusAlert tone={tone}>Current state</StatusAlert>);
    expect(alertMarkup).toContain(recipe);
    expect(alertMarkup).toContain('role="alert"');
  });

  it.each(METRIC_VALUE_RECIPES)("renders the %s metric tone without changing its neutral surface", (tone, recipe) => {
    const markup = renderToStaticMarkup(<MetricCard label="Orders" value="24" valueTone={tone} detail="Today" />);

    expect(getMetricValueClassName(tone)).toBe(recipe);
    expect(markup).toContain(recipe);
    expect(markup).toContain("Orders");
    expect(markup).toContain("Today");
    expect(markup).toContain("bg-zinc-950/60");
  });

  it("retains safe layout classes while rejecting conflicting route classes from every primitive", () => {
    const markup = [
      renderToStaticMarkup(<Surface {...hostileStyleProps} variant="page" className={conflictingRouteClasses}>Orders</Surface>),
      renderToStaticMarkup(<Button {...hostileStyleProps} variant="danger" className={conflictingRouteClasses}>Delete</Button>),
      renderToStaticMarkup(<StatusBadge {...hostileStyleProps} tone="warning" className={conflictingRouteClasses}>Pending</StatusBadge>),
      renderToStaticMarkup(<StatusAlert {...hostileStyleProps} tone="danger" className={conflictingRouteClasses}>Blocked</StatusAlert>),
      renderToStaticMarkup(<MetricCard {...hostileStyleProps} label="Orders" value="24" valueTone="success" className={conflictingRouteClasses} />),
    ];

    for (const renderedPrimitive of markup) {
      expect(renderedPrimitive).toContain("w-full");
      expect(renderedPrimitive).not.toMatch(/fuchsia|background-image|border-top-color|style=/);
    }

    expect(markup[0]).toContain("rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm");
    expect(markup[1]).toContain("border border-rose-800/50 bg-rose-950/20 text-rose-200");
    expect(markup[2]).toContain("border-amber-800/50 bg-amber-950/20 text-amber-200");
    expect(markup[3]).toContain("border-rose-800/50 bg-rose-950/20 text-rose-200");
    expect(markup[4]).toContain("bg-zinc-950/60");
    expect(markup[4]).toContain("text-emerald-200");
  });
});
