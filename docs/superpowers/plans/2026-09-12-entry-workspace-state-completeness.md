# Entry, Dashboard, and Workspace State Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Operator Console design language to Login, Dashboard, Workspace support states, modals, and narrow viewport layouts without changing CRM behavior.

**Architecture:** Reuse the existing `Surface`, `Button`, `StatusBadge`, `StatusAlert`, and `MetricCard` primitives. Add a small state-panel composition only if repeated state layout cannot be expressed cleanly with those primitives; keep data ownership and call behavior in existing components. Validate semantic roles and responsive contracts with Vitest, then verify representative routes in the browser.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Lucide.

**Spec:** `docs/superpowers/specs/2026-09-12-entry-workspace-state-completeness-design.md`

## Global Constraints

- Preserve routes, database access, authorization, keyboard controls, call behavior, server actions, and persisted user data.
- `Surface`, `Button`, `StatusBadge`, `StatusAlert`, and `MetricCard` remain the only recipes for their respective UI roles.
- Normal information is neutral. `success` means confirmed completion, `warning` means required decision or attention, and `danger` means failure, risk, or destructive action.
- Loading, empty, and unavailable information uses `StatusAlert tone="neutral" role="status"`; errors retain `role="alert"`.
- Every modal uses `Surface variant="overlay"`; narrow layouts keep dialogs within the viewport and make their content scroll internally.
- Copy remains operational and must not remove access-control, legal, simulation, or missing-data truth.

---

### Task 1: State and responsive contracts

**Files:**
- Create: `tests/design-system-state-render.test.tsx`
- Modify: `tests/dashboard-ui-contract.test.ts`, `tests/login-role-entry.test.ts`, `tests/operator-next-action-ui-contract.test.ts`, `tests/recent-context.test.ts`

**Interfaces:**
- Consumes existing shared UI primitives and current route/component contracts.
- Produces executable assertions for semantic roles, modal recipes, and narrow-layout class requirements used by Tasks 2–4.

- [ ] **Step 1: Write failing state and responsive tests.**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { StatusAlert } from "@/components/ui/Status";

it("uses non-interrupting status for neutral state and alert for failure", () => {
  expect(renderToStaticMarkup(<StatusAlert tone="neutral" role="status">Loading</StatusAlert>)).toContain('role="status"');
  expect(renderToStaticMarkup(<StatusAlert tone="danger">Save failed</StatusAlert>)).toContain('role="alert"');
});

it("keeps semantic state opacity fixed", () => {
  const warning = renderToStaticMarkup(<StatusAlert tone="warning">Callback is due</StatusAlert>);
  expect(warning).toContain("bg-amber-950/20");
  expect(warning).not.toContain("bg-amber-950/30");
});
```

Add source contracts that Login, Dashboard, and Workspace modal files import shared primitives and include `max-w`, `overflow-y-auto`, or equivalent narrow-layout protections where content can exceed the viewport.

- [ ] **Step 2: Run the focused tests and verify the new source assertions fail.**

Run: `npm test -- tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts`

Expected: the new route/state assertions fail because the target files still use local recipes.

- [ ] **Step 3: Commit the red test contract.**

```bash
git add tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts
git commit -m "test: define entry and workspace state contracts"
```

### Task 2: Login and Dashboard surfaces

**Files:**
- Modify: `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/CallActivityChart.tsx`, `src/components/dashboard/KpiCards.tsx`, `src/components/dashboard/NextBestActionCard.tsx`, `src/components/dashboard/RecentActivityFeed.tsx`, `src/components/dashboard/ReorderWidget.tsx`, `src/components/dashboard/TeamLeaderDailyBriefCard.tsx`, `src/components/dashboard/TopPerformers.tsx`

**Interfaces:**
- Consumes Task 1’s state contracts and existing shared UI primitives.
- Produces Login and Dashboard surfaces with consistent action, metric, empty, unavailable, and error treatment while preserving role redirects and data boundaries.

- [ ] **Step 1: Replace Login local recipes with shared primitives.**

Use `Surface variant="page"` for the form card, `StatusAlert tone="danger"` for authentication failure, and `Button` for submission. Keep the email/password controlled fields and Supabase call unchanged. Add `type="email"`, readable labels, `focus-visible` styling through the shared button, and a narrow-safe outer `px-4 sm:px-6` layout.

- [ ] **Step 2: Migrate Dashboard actions, metrics, and state panels.**

Use `Button` for `Add Lead` and `Launch Operator Console`, `MetricCard` for ordinary KPIs, `Surface` for dashboard panels, and `StatusAlert` for explicit unavailable/error states. Keep “no synthetic priorities”, workspace scope, role guards, and all server data calls unchanged. Normal activity remains neutral.

- [ ] **Step 3: Migrate Dashboard child components.**

Replace repeated local card and alert recipes in the listed child components with `Surface`, `MetricCard`, and `StatusAlert`. Preserve chart SVG/data rendering, links, empty copy, and loading behavior. Add `min-w-0` to chart/content columns where labels can overflow.

- [ ] **Step 4: Run focused tests and static checks.**

Run: `npm test -- tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts`; then `npm run lint` and `npm run typecheck`.

Expected: all focused tests pass; Login and Dashboard contain no route-local semantic alert/button/metric recipes.

- [ ] **Step 5: Commit Login and Dashboard.**

```bash
git add src/app/login/page.tsx src/app/dashboard/page.tsx src/components/dashboard tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts
git commit -m "style: unify login and dashboard surfaces"
```

### Task 3: Workspace supporting states and modals

**Files:**
- Modify: `src/components/workspace/CallbackScheduleModal.tsx`, `src/components/workspace/IncomingCallModal.tsx`, `src/components/workspace/PostCallSummaryCard.tsx`, `src/components/workspace/LeadNotesCard.tsx`, `src/components/workspace/CustomerTimelineCard.tsx`, `src/components/workspace/AdditionalQuestionsCard.tsx`
- Modify: `src/app/workspace/page.tsx`

**Interfaces:**
- Consumes shared primitives and existing Operator Console behavior.
- Produces consistent modal overlays, confirmation/error/success states, notes/timeline empty states, and narrow workspace support panels.

- [ ] **Step 1: Add modal and workspace state assertions.**

```tsx
it("uses the shared overlay and action primitives for workspace modals", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/workspace/CallbackScheduleModal.tsx"), "utf8");
  expect(source).toContain('Surface variant="overlay"');
  expect(source).toContain('import { Button } from "@/components/ui/Button"');
});
```

Add equivalent assertions for `IncomingCallModal`, success/error feedback, and narrow-safe modal content.

- [ ] **Step 2: Migrate Callback and Incoming Call modals.**

Use `Surface variant="overlay"`, shared `Button` variants, and `StatusAlert` for error/success feedback. Preserve Escape/close behavior, focusable controls, call actions, callback persistence, and existing API/server action calls. Keep modal content scrollable with `max-h-[min(...)] overflow-y-auto` or the project’s established equivalent.

- [ ] **Step 3: Migrate post-call, notes, timeline, and questions cards.**

Use shared surfaces and semantic statuses for saved notes, validation, pending decisions, and empty timeline/questions. Keep operator permissions and read/write boundaries unchanged; normal customer history remains neutral.

- [ ] **Step 4: Harden Workspace narrow layout.**

Ensure the script panel and supporting client information use `min-w-0`, action rows wrap, modal buttons stack below `sm`, and no fixed-width child can crop the script or client data. Do not reintroduce Compact/Extended modes.

- [ ] **Step 5: Run Workspace tests and commit.**

Run: `npm test -- tests/design-system-state-render.test.tsx tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts tests/workspace-readiness-ui-contract.test.ts`; then `npm run lint` and `npm run typecheck`.

```bash
git add src/app/workspace/page.tsx src/components/workspace tests/design-system-state-render.test.tsx tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts
git commit -m "style: unify workspace support states and modals"
```

### Task 4: Responsive verification and documentation handoff

**Files:**
- Create: `docs/superpowers/reports/2026-09-12-entry-workspace-state-completeness-verification.md`
- Modify: `PROJECT.md`, `README.md`, `docs/README.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`

**Interfaces:**
- Consumes Tasks 1–3 and the approved spec.
- Produces browser-backed evidence, exact verification commands, and backlog ordering for the remaining daily route wave.

- [ ] **Step 1: Run the complete automated suite.**

Run: `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`.

Expected: every command exits 0.

- [ ] **Step 2: Verify desktop and narrow browser states.**

Inspect `/login`, `/dashboard`, and `/workspace` at desktop and narrow viewport sizes. Also spot-check `/orders`, `/products`, and `/settings` at the narrow size. Verify loading, empty, unavailable, error, success, modal overlay, action wrapping, focus visibility, and absence of clipped content without triggering persistence-changing actions.

- [ ] **Step 3: Record evidence and backlog position.**

Write exact viewport sizes, routes, command outputs, and unavailable authenticated data to the report. Link the spec, plan, and report from the project docs. Place this prerequisite before the Client Profile plan in `docs/AKTUALNI_STAV_A_DESATERO.md`.

- [ ] **Step 4: Commit evidence and documentation.**

```bash
git add docs/superpowers/reports/2026-09-12-entry-workspace-state-completeness-verification.md PROJECT.md README.md docs/README.md docs/AKTUALNI_STAV_A_DESATERO.md
git commit -m "docs: verify entry and workspace state completeness"
```

## Completion Definition

Login, Dashboard, Workspace support states, and their modals use the same Operator Console visual language at desktop and narrow widths. The full test/lint/typecheck/build suite and browser evidence pass, with no changes to CRM behavior or authorization.
