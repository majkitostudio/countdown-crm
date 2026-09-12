# Entry, Workspace, and System State Completeness Design

## Goal

Complete the approved Operator Console visual system across the remaining product entry points and reusable state treatments: Login, Dashboard, Workspace, modal dialogs, and narrow viewports. This is the first of two remaining whole-product waves; the later wave covers daily operator routes that are not in this scope.

## Scope

- `/login`, `/dashboard`, and `/workspace` plus their directly owned dashboard and workspace components.
- Shared loading, empty, unavailable, error, success, warning, confirmation, and modal treatments used by those surfaces.
- Narrow viewport behavior for Login, Dashboard, Workspace, Orders, Products, and Settings, including action wrapping, dialog sizing, readable horizontal data overflow, and keyboard focus visibility.
- No change to routes, database access, authorization, keyboard controls, call behavior, server actions, or persisted user data.

## Visual Contract

- `Surface`, `Button`, `StatusBadge`, `StatusAlert`, and `MetricCard` remain the only recipes for their respective UI roles.
- Normal information is neutral. `success` represents a confirmed completed action, `warning` a required decision or attention, and `danger` failure, risk, or destructive action.
- Loading, empty, and unavailable information uses `StatusAlert tone="neutral" role="status"`; it must not interrupt assistive technology as an error.
- Every modal uses `Surface variant="overlay"`; the backdrop, close action, cancellation, primary action, destructive action, and feedback state use the shared recipes.
- Copy is concise and operational without changing legal, access-control, or data-truth meaning.
- At narrow widths, page actions stack or wrap, dialogs fit within the viewport with internal scrolling, and data-heavy content has an accessible horizontal overflow treatment rather than clipped text.

## Component Boundaries

- A small `StatePanel` helper will be introduced only if the existing primitives cannot express the repeated loading/empty/unavailable composition without duplicating layout. It will accept `state`, `title`, `detail`, and optional action and map semantic output solely through `Surface` and `StatusAlert`.
- Dashboard components retain data ownership; their responsibility is presentation using the shared primitives.
- Workspace components retain telephony and keyboard behavior; modal components own only modal layout and shared feedback presentation.

## Accessibility and Verification

- Informational states use `role="status"`; errors retain `role="alert"`.
- Modals keep their existing focus management and Escape/close behavior. Their initial focus and visible focus ring are verified.
- Tests cover semantic class contracts, roles, and key narrow-layout class contracts. Browser checks cover desktop and narrow viewports without persistence-changing actions.

## Acceptance Criteria

1. Login, Dashboard, Workspace, and their state/modals render identical semantic recipes for equivalent roles.
2. No ordinary metric or row gets decorative semantic color.
3. All targeted tests, full tests, lint, typecheck, build, diff check, and browser route checks pass.
4. A verification report records exact routes, viewport sizes, and any unavailable authenticated data.
