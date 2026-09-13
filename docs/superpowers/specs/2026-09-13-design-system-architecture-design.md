# Countdown CRM Design System Architecture

**Date:** 2026-09-13

**Status:** Approved for implementation planning

## Goal

Remove the architectural causes of visual drift across Countdown CRM. Build a
semantic design system that governs tokens, components, page composition,
responsive behavior, accessibility, and automated enforcement without changing
business logic, authorization, persistence, or route behavior.

The authenticated application must remain fully usable at viewport widths from
390 pixels upward.

## Audit Baseline

The existing application has a partial shared UI layer rather than a complete
design system:

- `Surface`, `Button`, `Status`, and `MetricCard` contain fixed Tailwind recipes.
- `PageHeader` provides a shared route heading but does not govern the rest of a
  page's composition.
- `globals.css` has no semantic token layer; visual values are repeated directly
  throughout route and feature components.
- The source contains 228 native button, input, select, textarea, and table
  elements. Their visual, focus, disabled, loading, and responsive behavior is
  implemented locally.
- `Status` lacks `info` and `blocked` semantics and does not distinguish static
  state from an interactive filter or toggle.
- Shared primitives silently discard every consumer layout class except
  `w-full`, encouraging wrapper proliferation and duplicated styling.
- Several tests assert only that a file imports a primitive. They do not prove
  that the rendered interface uses the primitive or conforms to the visual
  contract.
- At 390 pixels the fixed compact sidebar, page padding, desktop tables, and
  persistent footer compete for the available width. Important content and
  actions are clipped or obscured.
- Sampled modals do not expose a dialog role or a consistent accessible name and
  do not share a documented focus-management contract.

This baseline supersedes the earlier statement that all routes were fully
migrated. Existing components and tests are inputs to the refactor, not proof of
completion.

## Chosen Approach

Keep React, Next.js, Tailwind CSS, and the current restrained dark visual
direction. Introduce a semantic layer over Tailwind instead of replacing the UI
stack with a third-party component library.

The system has four layers:

1. semantic design tokens;
2. accessible UI primitives;
3. shared composition patterns;
4. route-specific content and business behavior.

Routes may choose semantic variants, density, and layout modes. They may not
create new colors, surface recipes, control recipes, focus treatments, or page
spacing conventions.

## Semantic Tokens

Define token aliases in `src/app/globals.css` and expose them through Tailwind
utilities. Components consume semantic roles rather than raw palette values.

Required token groups:

- canvas and surfaces: canvas, page, inset, raised, overlay;
- borders: subtle, default, strong, interactive;
- text: primary, secondary, muted, disabled, inverse;
- actions: primary, secondary, quiet, destructive;
- states: neutral, info, success, warning, danger, blocked;
- focus: ring color, width, and offset;
- geometry: control, inset, page, pill, and overlay radii;
- spacing: control, field, section, page, and responsive page gutters;
- elevation and overlay backdrop;
- motion duration and easing, with reduced-motion behavior.

Raw Zinc values remain implementation details of the default theme. Feature and
route components must not depend on them for semantic meaning.

## Primitive Components

The shared UI package must provide the following public components:

- `Button` and `IconButton`, with semantic variant, size, loading, and disabled
  behavior. Link-styled actions use the same recipe through an explicit API.
- `Surface`, with semantic variant, padding, width, and overflow options.
- `StatusBadge` and `StatusAlert`, supporting `neutral`, `info`, `success`,
  `warning`, `danger`, and `blocked`.
- `FilterChip` and `ToggleChip` for interactive states. A static status badge is
  never used as a selectable control.
- `Field`, `Input`, `Textarea`, `Select`, and `Checkbox`, including labels,
  descriptions, validation messages, focus state, disabled state, and relevant
  autocomplete support.
- `Dialog`, `Drawer`, and `Popover`, with accessible naming, focus placement,
  focus containment where appropriate, Escape handling, close controls, and
  focus return.
- `Tabs`, with tablist, tab, and tabpanel semantics and keyboard navigation.
- `Table` and `DataList`, with a documented responsive mode.
- `EmptyState`, `LoadingState`, `ErrorState`, and `Skeleton`.
- `MetricCard`, using neutral presentation unless the value itself communicates
  a confirmed semantic outcome.

Primitive APIs must be explicit. They must not silently discard consumer input.
Development builds and static checks must expose unsupported visual overrides.
`className` may be used for layout only through an allowlisted helper or typed
layout props; visual tokens remain owned by the primitive.

## Composition Patterns

Authenticated routes use a common page skeleton:

```text
PageLayout
├── PageHeader
├── PageFeedback
├── MetricGrid / Toolbar
└── PageContent
```

Required composition components:

- `PageLayout` owns maximum width, vertical rhythm, and responsive gutters.
- `PageHeader` owns title, description, badge, back navigation, and action
  layout.
- `PageFeedback` reserves a predictable location for loading, error,
  unavailable, and success feedback.
- `Section` and `SectionHeader` own nested content hierarchy.
- `Toolbar` and `FilterBar` own wrapping, overflow, and narrow-screen ordering.
- `MetricGrid` owns card count and responsive columns.
- `FormSection` and `FormActions` own form grouping and action placement.
- `DataTableShell` owns table framing, overflow, captioning, and mobile strategy.
- `CardGrid` owns responsive card layouts.

Feature components supply data and actions to these patterns. They do not
redefine page gutters, surface material, section spacing, or breakpoints.

## Responsive Contract

The interface supports three shell modes:

- **390–767 px:** no permanently width-consuming sidebar. Navigation opens as a
  modal drawer from the application header. The content canvas receives the
  full viewport width.
- **768–1199 px:** compact icon navigation is permitted. Tooltips and accessible
  names expose every destination.
- **1200 px and wider:** expanded navigation is the default and may be collapsed
  by the user.

Page and component rules:

- Page actions stack or wrap without horizontal viewport overflow.
- Forms become one column before fields become too narrow.
- Cards never create document-level horizontal overflow.
- Every data-heavy view explicitly chooses either a mobile `DataList` rendering
  or an accessible horizontally scrollable table region.
- Horizontal table regions are keyboard reachable, labelled, and visually
  indicate that more content is available.
- Persistent shell elements must not obscure route content.
- Primary mobile controls target at least 44 by 44 CSS pixels.
- Long identifiers and unbroken text wrap or truncate with an accessible full
  value.
- The supported viewport matrix is 390x844, 768x1024, 1440x900, and one wide
  desktop viewport of at least 1920 pixels.

## Accessibility Contract

- Every interactive element has an accessible name.
- Visible labels remain associated with form controls.
- Focus indicators use one shared high-contrast recipe.
- Dialogs and drawers announce their title and optional description, place
  initial focus predictably, close on Escape, and return focus to their trigger.
- Tabs support Arrow Left, Arrow Right, Home, and End.
- Neutral loading and informational feedback uses `role="status"`; errors that
  require immediate awareness use `role="alert"`.
- Color is never the only carrier of status.
- Reduced-motion preferences disable non-essential transitions.
- Automated checks supplement, but do not replace, keyboard and screenshot
  review.

## Enforcement

Replace import-presence tests with behavioral contracts:

- static checks reject new native buttons and form controls outside the shared
  UI package and an explicit, documented allowlist;
- static checks reject new route-level semantic color recipes and duplicated
  surface recipes;
- component render tests cover every variant and state;
- interaction tests cover keyboard behavior, focus management, disabled and
  loading behavior, and accessible names;
- route-level tests verify the composition skeleton rather than import text;
- Playwright smoke tests visit every authenticated route as Administrator at all
  supported viewport widths;
- browser tests assert no document-level horizontal overflow, no obscured
  primary actions, and no unexpected console errors;
- visual evidence covers default, loading, empty, unavailable, error, success,
  modal, drawer, and data-heavy states where those states exist.

Existing tests that merely search for an import or class-name substring must be
removed or converted in the same change that introduces the stronger contract.

## Migration Strategy

Migration proceeds in independently testable waves:

1. tokens and primitive API contracts;
2. responsive shell and navigation;
3. fields, feedback, overlays, tabs, tables, and composition patterns;
4. shared feature components;
5. authenticated routes grouped by workflow;
6. loading, empty, unavailable, error, and permission states;
7. complete responsive and accessibility verification;
8. removal of legacy recipes and activation of strict guardrails.

Compatibility adapters may exist only while their callers are being migrated.
They must be removed before completion. No final route may rely on legacy glass
utilities, duplicated control recipes, or fake imports used solely to satisfy a
test.

## Business-Logic Boundary

The refactor must not intentionally change:

- authentication or authorization decisions;
- workspace scoping;
- data loading, persistence, or server actions;
- workflow, telephony, training, order, wallet, or lead semantics;
- URLs and navigation destinations;
- audit behavior or destructive-operation confirmation requirements.

If verification exposes a functional defect, record it separately. Fix it in
this project only when it blocks safe migration or verification, and cover it
with a focused regression test.

## Verification and Completion

Completion requires all of the following:

- every authenticated route and relevant state uses semantic tokens, primitives,
  and composition patterns;
- the application is fully usable from 390 pixels upward;
- no document-level horizontal overflow occurs at supported viewport sizes;
- primary actions remain visible and operable;
- dialog, drawer, tab, and form keyboard behavior passes focused tests;
- static drift-prevention checks are enabled in CI;
- unit, integration, lint, typecheck, and production build commands pass;
- an Administrator Playwright audit covers every navigation destination and key
  interactive state;
- the final report maps each original inconsistency to its governing rule,
  shared fix, affected files, and verification evidence;
- the branch is merged to `main` only after the user requests integration and
  the final verification is clean.

