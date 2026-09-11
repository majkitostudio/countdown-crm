# Unified Operator Console Design System

**Date:** 2026-09-11

**Status:** Approved design — awaiting written-spec review

## Goal

Make Countdown CRM feel like one professional operator product. The approved
Operator Console is the visual reference for every application route: calm
dark surfaces, concise operator-oriented copy, disciplined hierarchy, and
colour reserved for operational meaning.

This is a presentation and copy change. It must not alter business rules,
workspace scope, authorization, persistence, route behavior, or existing user
workflows.

## Visual Foundations

The application uses a small, semantic set of reusable surfaces. A component
with the same role must use the same surface, border, radius, text contrast,
and opacity on every route.

| Semantic role | Intended treatment |
| --- | --- |
| Application canvas | Near-black neutral background. No decorative colour fields. |
| Page surface | One consistent translucent dark panel with a subtle neutral border. |
| Inset surface | One consistent darker neutral panel for filters, table controls, form groups, and nested content. |
| Overlay | Opaque, elevated neutral surface for modals and menus. |
| Primary action | The existing restrained light neutral button. |
| Secondary action | Neutral outline or inset button. |
| Destructive action | Red treatment only when the operation is destructive or confirms an error state. |

Intentional hierarchy is allowed only through these semantic roles. For
example, a page surface and an inset surface may differ, but two page surfaces
must never have page-specific opacity values.

## Typography And Copy

- White is reserved for page titles, important values, and the primary next
  action.
- Zinc text provides normal body copy, supporting metadata, and helper text in
  a fixed hierarchy.
- Descriptions answer either what the page is for or what the operator should
  do next. They do not repeat implementation details or promotional language.
- Labels use short, consistent nouns. Empty, loading, and unavailable states
  explain the situation plainly and name a next action when one exists.
- Existing functional labels, legal copy, and domain meanings remain intact
  unless a shorter equivalent preserves the same meaning.

## Colour Policy

Neutral is the default for all normal content, including ordinary table rows,
metrics, filter states, and successful-looking data. Colour is semantic and
uses one visual recipe across the application.

| Colour | Meaning | Permitted use |
| --- | --- | --- |
| Green | Confirmed positive completion | Confirmed delivery, completed save, verified success. |
| Amber | Attention or decision required | Due callback, validation warning, incomplete required action. |
| Red | Error, risk, failure, or destructive operation | Failed operation, cancellation, destructive confirmation. |
| Neutral | Everything else | Standard order statuses, counts, rows, informational badges, and metrics. |

Colour must not be used merely to decorate a category, make a metric feel
important, or differentiate regular list rows. Each semantic state has one
shared background, border, text colour, and opacity; no route creates an
alternate “stronger” version of the same state.

## Shared Building Blocks

The implementation introduces and adopts the following shared primitives or
semantic class contracts:

1. `PageHeader` — route title, concise purpose, state badge, back navigation,
   and actions.
2. `Surface` — page, inset, table, empty-state, and overlay variants.
3. `Button` — primary, secondary, quiet, and destructive variants.
4. `StatusBadge` and `StatusAlert` — neutral, success, warning, and danger
   states using the colour policy above.
5. `MetricCard` — neutral by default; semantic colour only when the metric
   itself represents a confirmed outcome, required attention, or a problem.

The existing Operator Console is migrated to the same primitives where doing
so preserves its approved appearance. It remains the reference screen, not a
separate theme.

## Conversion Scope And Order

The visual-system prerequisite completes before the planned Client Profile and
verified-delivery-address feature begins.

1. **Foundation:** global tokens/utilities, app shell, navigation, app header,
   page header, and shared primitives.
2. **Operator routes:** Orders and order detail/edit/create, Leads and lead
   detail, Calls and call review, Calendar, Training and training reviews.
3. **Management routes:** Products, Team, Wallet, Readiness, Telephony,
   Settings and scripts, Workflows, Monitor, Audit, Analytics, Exceptions, and
   dynamic object views.
4. **State completeness:** loading, empty, unavailable, success, warning,
   error, modal, and mobile/narrow layouts.
5. **Feature continuation:** only then resume the approved Operator Client
   Profile implementation plan.

## Verification

- Add focused component and route contracts for shared primitives and semantic
  colour policy.
- Run the existing test, lint, typecheck, and production-build suites.
- Capture Operator Console and representative screens from every conversion
  family at the same desktop viewport, comparing card surfaces, buttons,
  badges, text hierarchy, and state visibility.
- Verify keyboard focus, readable contrast, responsive layouts, and all
  existing actions after each conversion wave.
- Confirm normal tables and metrics are neutral, while colour appears only for
  the approved semantic states.

## Completion Definition

An operator can move between any CRM route and experience the same visual
material, typography, actions, and status language as Operator Console. A
coloured element communicates a real outcome, required attention, or risk;
ordinary data is deliberately neutral. No feature behavior changes as a side
effect of this redesign.
