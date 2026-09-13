import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { Surface, getSurfaceClassName } from "@/components/ui/Surface";
import { StatusAlert, StatusBadge, getStatusClassName, type SemanticTone } from "@/components/ui/Status";
import { MetricCard, getMetricValueClassName } from "@/components/ui/MetricCard";
import { FieldLabel, SelectField, TextAreaField, TextField, getFieldClassName } from "@/components/ui/Field";
import { Dialog, getDialogPanelClassName } from "@/components/ui/Dialog";

const STATUS_RECIPES = [
  ["neutral", "border-status-neutral-border bg-status-neutral text-status-neutral-text"],
  ["success", "border-status-success-border bg-status-success text-status-success-text"],
  ["warning", "border-status-warning-border bg-status-warning text-status-warning-text"],
  ["danger", "border-status-danger-border bg-status-danger text-status-danger-text"],
] as const;

const SURFACE_RECIPES = [
  ["page", "rounded-surface border border-border-default border-t-border-highlight bg-surface-page shadow-sm"],
  ["inset", "rounded-control border border-border-default bg-surface-inset"],
  ["table", "overflow-hidden rounded-surface border border-border-default bg-surface-page shadow-sm"],
  ["empty", "rounded-surface border border-border-default bg-surface-page p-12 text-center shadow-sm"],
  ["overlay", "rounded-overlay border border-border-default bg-surface-overlay shadow-overlay"],
] as const;

const BUTTON_RECIPES = [
  ["primary", "bg-action-primary text-text-inverse hover:bg-action-primary-hover"],
  ["secondary", "border border-border-default bg-action-secondary text-text-secondary hover:border-border-strong hover:bg-action-secondary-hover"],
  ["quiet", "text-text-muted hover:bg-action-secondary-hover hover:text-text-secondary"],
  ["danger", "border border-status-danger-border bg-action-danger text-status-danger-text hover:bg-action-danger-hover"],
] as const;

const METRIC_VALUE_RECIPES = [
  ["neutral", "text-text-primary"],
  ["success", "text-status-success-text"],
  ["warning", "text-status-warning-text"],
  ["danger", "text-status-danger-text"],
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
      "rounded-surface border border-border-default border-t-border-highlight bg-surface-page shadow-sm"
    );
    expect(renderToStaticMarkup(<Surface variant="page">Orders</Surface>)).toContain("bg-surface-page");
  });

  it("keeps ordinary status and metric content neutral", () => {
    expect(getStatusClassName("neutral")).toContain("text-status-neutral-text");
    expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
    const metricMarkup = renderToStaticMarkup(<MetricCard label="Orders" value="24" />);
    expect(metricMarkup).toContain("text-text-primary");
    expect(metricMarkup).toMatch(/bg-surface-inset"><div class="p-4">/);
  });

  it("gives every semantic state one shared recipe", () => {
    expect(getStatusClassName("success")).toBe("border-status-success-border bg-status-success text-status-success-text");
    expect(getStatusClassName("warning")).toBe("border-status-warning-border bg-status-warning text-status-warning-text");
    expect(getStatusClassName("danger")).toBe("border-status-danger-border bg-status-danger text-status-danger-text");
  });

  it("defines shared informational and blocked state recipes", () => {
    expect(getStatusClassName("info" as SemanticTone)).toBe("border-status-info-border bg-status-info text-status-info-text");
    expect(getStatusClassName("blocked" as SemanticTone)).toBe("border-status-blocked-border bg-status-blocked text-status-blocked-text");
    expect(renderToStaticMarkup(<StatusBadge tone={"info" as SemanticTone}>Details available</StatusBadge>)).toContain("text-status-info-text");
    expect(renderToStaticMarkup(<StatusAlert tone={"blocked" as SemanticTone}>Action is blocked</StatusAlert>)).toContain("text-status-blocked-text");
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

  it("gives text, select, and multiline fields one semantic control recipe", () => {
    const recipe = "w-full rounded-control border border-border-default bg-surface-inset px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50";
    expect(getFieldClassName()).toBe(recipe);

    for (const renderedField of [
      renderToStaticMarkup(<TextField placeholder="Name" />),
      renderToStaticMarkup(<SelectField><option>Choose</option></SelectField>),
      renderToStaticMarkup(<TextAreaField placeholder="Note" />),
    ]) {
      expect(renderedField).toContain(recipe);
      expect(renderedField).not.toMatch(/zinc-|style=/);
    }

    expect(renderToStaticMarkup(<FieldLabel htmlFor="name">Name</FieldLabel>)).toContain("text-text-secondary");
  });

  it("uses one responsive dialog shell for admin overlays", () => {
    expect(getDialogPanelClassName("md")).toBe("relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-md");
    const markup = renderToStaticMarkup(
      <Dialog isOpen onClose={() => undefined} aria-labelledby="dialog-title">
        <h2 id="dialog-title">Edit field</h2>
      </Dialog>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("items-end");
    expect(markup).toContain("md:items-center");
    expect(markup).toContain("bg-surface-overlay");
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
    expect(markup).toContain("bg-surface-inset");
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

    expect(markup[0]).toContain("rounded-surface border border-border-default border-t-border-highlight bg-surface-page shadow-sm");
    expect(markup[1]).toContain("border border-status-danger-border bg-action-danger text-status-danger-text");
    expect(markup[2]).toContain("border-status-warning-border bg-status-warning text-status-warning-text");
    expect(markup[3]).toContain("border-status-danger-border bg-status-danger text-status-danger-text");
    expect(markup[4]).toContain("bg-surface-inset");
    expect(markup[4]).toContain("text-status-success-text");
  });
});
