# Unified Operator Console Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Give every Countdown CRM screen the approved Operator Console visual material, concise copy, and restrained semantic colour system without changing CRM behavior.

**Architecture:** Introduce small reusable React primitives for surfaces, buttons, semantic statuses, and metrics. Migrate the shared shell first, then operator and management route families in separate reviewable waves. One shared class recipe owns each semantic role; route-local Tailwind values cannot redefine its opacity, border, radius, or semantic colour treatment.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Lucide, in-app browser visual checks.

**Spec:** \`docs/superpowers/specs/2026-09-11-unified-operator-console-design-system.md\`

## Global Constraints

- Preserve business rules, routes, workspace scope, authorization, persistence, and all existing user workflows.
- Operator Console is the reference screen, not a separate theme; its approved appearance remains intact.
- Components with the same semantic role use the same surface, border, radius, text contrast, and opacity on every route.
- Normal data is neutral. Green means confirmed completion, amber means attention or a required decision, and red means error, risk, failure, or destructive action.
- Do not use colour merely to decorate categories, metrics, ordinary list rows, or regular order statuses.
- Rewrite copy only when its operational meaning, legal meaning, and user action remain unchanged.
- Complete this plan before resuming \`2026-09-11-operator-client-profile-and-verified-address.md\`.

---

### Task 1: Semantic UI primitives and contracts

**Files:**
- Create: \`src/components/ui/Surface.tsx\`, \`src/components/ui/Button.tsx\`, \`src/components/ui/Status.tsx\`, \`src/components/ui/MetricCard.tsx\`, \`tests/design-system-primitives.test.tsx\`
- Modify: \`src/app/globals.css\`, \`tests/crm-color-hierarchy.test.ts\`, \`tests/header-foundation.test.ts\`

**Interfaces:**
- Produces \`Surface\`, \`getSurfaceClassName\`, \`Button\`, \`getButtonClassName\`, \`StatusBadge\`, \`StatusAlert\`, \`getStatusClassName\`, \`MetricCard\`, and \`getMetricValueClassName\`.
- Semantic tones are exactly \`"neutral" | "success" | "warning" | "danger"\`.

- [ ] **Step 1: Write failing primitive rendering tests.**

~~~tsx
import { renderToStaticMarkup } from "react-dom/server";
import { Surface, getSurfaceClassName } from "@/components/ui/Surface";
import { StatusBadge, getStatusClassName } from "@/components/ui/Status";
import { MetricCard } from "@/components/ui/MetricCard";

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
~~~

- [ ] **Step 2: Run the primitive tests and verify they fail because the modules do not exist.**

Run: \`npm test -- tests/design-system-primitives.test.tsx tests/crm-color-hierarchy.test.ts tests/header-foundation.test.ts\`

Expected: FAIL with unresolved \`@/components/ui/*\` imports.

- [ ] **Step 3: Implement the shared primitive contracts.**

~~~tsx
// src/components/ui/Surface.tsx
export type SurfaceVariant = "page" | "inset" | "table" | "empty" | "overlay";

const SURFACE_CLASS_NAMES: Record<SurfaceVariant, string> = {
  page: "rounded-2xl border border-zinc-800/80 border-t-white/5 bg-zinc-900/60 shadow-sm",
  inset: "rounded-xl border border-zinc-800/80 bg-zinc-950/60",
  table: "overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-sm",
  empty: "rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-12 text-center shadow-sm",
  overlay: "rounded-2xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl",
};

export function getSurfaceClassName(variant: SurfaceVariant): string {
  return SURFACE_CLASS_NAMES[variant];
}
~~~

~~~tsx
// src/components/ui/Status.tsx
export type SemanticTone = "neutral" | "success" | "warning" | "danger";

const STATUS_CLASS_NAMES: Record<SemanticTone, string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
  success: "border-emerald-800/50 bg-emerald-950/20 text-emerald-200",
  warning: "border-amber-800/50 bg-amber-950/20 text-amber-200",
  danger: "border-rose-800/50 bg-rose-950/20 text-rose-200",
};

export function getStatusClassName(tone: SemanticTone): string {
  return STATUS_CLASS_NAMES[tone];
}
~~~

Implement \`Button\` with \`primary\`, \`secondary\`, \`quiet\`, and \`danger\` variants and \`MetricCard\` with a neutral \`valueTone\` default. Add only semantic CSS helpers to \`globals.css\`; do not add a second theme or page-specific surface utilities.

- [ ] **Step 4: Run primitive tests and the existing hierarchy tests.**

Run: \`npm test -- tests/design-system-primitives.test.tsx tests/crm-color-hierarchy.test.ts tests/header-foundation.test.ts\`

Expected: PASS; ordinary output is neutral and every semantic state renders its fixed shared recipe.

- [ ] **Step 5: Commit the primitive layer.**

~~~bash
git add src/app/globals.css src/components/ui/Surface.tsx src/components/ui/Button.tsx src/components/ui/Status.tsx src/components/ui/MetricCard.tsx tests/design-system-primitives.test.tsx tests/crm-color-hierarchy.test.ts tests/header-foundation.test.ts
git commit -m "feat: add shared operator console design primitives"
~~~

### Task 2: Shared shell, navigation, headers, and reference console

**Files:**
- Modify: \`src/components/layout/AppShell.tsx\`, \`src/components/layout/AppHeader.tsx\`, \`src/components/layout/Sidebar.tsx\`, \`src/components/layout/OperatorPresenceBadge.tsx\`, \`src/components/layout/CommandPalette.tsx\`, \`src/components/layout/PageHeader.tsx\`
- Modify: \`src/app/workspace/page.tsx\`, \`src/components/workspace/CallStatusBar.tsx\`, \`src/components/workspace/OperatorLeadHeader.tsx\`, \`src/components/workspace/OperatorNextActionPanel.tsx\`, \`src/components/workspace/ProductScriptPanel.tsx\`, \`src/components/workspace/ConversationBriefCard.tsx\`, \`src/components/workspace/RecentContextRow.tsx\`
- Create: \`tests/operator-console-reference-render.test.tsx\`
- Modify: \`tests/page-header-rollout.test.ts\`, \`tests/sidebar-navigation.test.ts\`, \`tests/crm-color-hierarchy.test.ts\`

**Interfaces:**
- Consumes Task 1 primitives.
- Produces the canonical visual reference used by every later route family.

- [ ] **Step 1: Write failing rendering tests for the shared shell and reference screen.**

~~~tsx
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader, getPageHeaderBadgeClassName } from "@/components/layout/PageHeader";
import { getStatusClassName } from "@/components/ui/Status";
import { PhoneCall } from "lucide-react";

it("renders the canonical page header with the shared page surface", () => {
  const markup = renderToStaticMarkup(<PageHeader icon={PhoneCall} title="Orders" description="Review and manage orders." />);
  expect(markup).toContain("bg-zinc-900/60");
  expect(markup).toContain("rounded-2xl");
});

it("maps unavailable and ordinary header badges to neutral", () => {
  expect(getPageHeaderBadgeClassName("neutral")).toBe(getStatusClassName("neutral"));
  expect(getPageHeaderBadgeClassName("unavailable")).toBe(getStatusClassName("neutral"));
});
~~~

- [ ] **Step 2: Run the reference tests and verify they fail.**

Run: \`npm test -- tests/operator-console-reference-render.test.tsx tests/page-header-rollout.test.ts tests/sidebar-navigation.test.ts\`

Expected: FAIL because \`PageHeader\` does not yet delegate to the shared status and surface contracts.

- [ ] **Step 3: Refactor the shell and Operator Console to use shared semantics.**

Replace local panel, button, and badge recipes in the listed files with Task 1 primitives. Preserve the current Operator Console hierarchy: assigned customer, next action, approved script, and supporting context. Normalize shell copy to short operational labels; do not alter navigation targets, role visibility, keyboard shortcuts, or action handlers.

- [ ] **Step 4: Capture desktop reference views after the refactor.**

Open \`/workspace\`, \`/orders\`, and \`/products\` at the same desktop viewport. Confirm sidebar, app header, page header, primary button, secondary button, and ordinary status badge use identical shared recipes.

- [ ] **Step 5: Run shell and reference contracts.**

Run: \`npm test -- tests/operator-console-reference-render.test.tsx tests/page-header-rollout.test.ts tests/sidebar-navigation.test.ts tests/crm-color-hierarchy.test.ts\`

Expected: PASS; Operator Console controls remain present and shared header/status output matches Task 1.

- [ ] **Step 6: Commit the shell migration.**

~~~bash
git add src/components/layout src/app/workspace/page.tsx src/components/workspace/CallStatusBar.tsx src/components/workspace/OperatorLeadHeader.tsx src/components/workspace/OperatorNextActionPanel.tsx src/components/workspace/ProductScriptPanel.tsx src/components/workspace/ConversationBriefCard.tsx src/components/workspace/RecentContextRow.tsx tests/operator-console-reference-render.test.tsx tests/page-header-rollout.test.ts tests/sidebar-navigation.test.ts tests/crm-color-hierarchy.test.ts
git commit -m "style: unify shared shell with operator console"
~~~

### Task 3: Daily operator route family

**Files:**
- Modify: \`src/app/orders/page.tsx\`, \`src/app/orders/new/page.tsx\`, \`src/app/orders/[orderId]/page.tsx\`, \`src/app/orders/[orderId]/edit/page.tsx\`, \`src/app/orders/loading.tsx\`, \`src/components/orders/OrderCreateForm.tsx\`, \`src/components/orders/OrderEditForm.tsx\`, \`src/components/orders/OrderPipeline.tsx\`, \`src/components/orders/OrderStatusEditor.tsx\`
- Modify: \`src/app/leads/page.tsx\`, \`src/app/leads/[leadId]/page.tsx\`, \`src/components/leads/LeadsTable.tsx\`, \`src/components/leads/LeadDetailDrawer.tsx\`, \`src/components/leads/CreateLeadModal.tsx\`, \`src/components/leads/CsvImportModal.tsx\`, \`src/components/leads/Customer360RetentionCard.tsx\`
- Modify: \`src/app/calls/page.tsx\`, \`src/app/calls/[callId]/review/page.tsx\`, \`src/components/calls/CallDetailDrawer.tsx\`, \`src/components/calls/CallReviewWorkspace.tsx\`, \`src/app/calendar/page.tsx\`, \`src/components/calendar/OperatorCalendar.tsx\`, \`src/app/training/page.tsx\`, \`src/app/training/reviews/page.tsx\`, \`src/app/training/reviews/[sessionId]/page.tsx\`
- Create: \`tests/operator-route-visual-contract.test.tsx\`
- Modify: \`tests/call-outcome-color.test.ts\`, \`tests/call-review-ui.test.ts\`, \`tests/customer-360-ui-contract.test.ts\`, \`tests/calendar-runtime.test.ts\`, \`tests/training-api-routes.test.ts\`

**Interfaces:**
- Consumes the Task 1 primitives.
- Produces neutral ordinary order/call/lead/training data; semantic colour remains only on approved outcomes, required attention, validation, and destructive/error states.

- [ ] **Step 1: Write failing route rendering tests.**

~~~tsx
it("keeps ordinary order status neutral", () => {
  expect(renderToStaticMarkup(<StatusBadge tone="neutral">In progress</StatusBadge>)).not.toMatch(/emerald|amber|rose/);
});

it("keeps an outcome choice semantically distinct", () => {
  expect(getStatusClassName("warning")).toContain("amber-950/20");
  expect(getStatusClassName("danger")).toContain("rose-950/20");
});
~~~

Extend the existing Call Outcome test to assert its selection remains distinguishable without adding a second amber/red recipe.

- [ ] **Step 2: Run the route tests and verify they fail.**

Run: \`npm test -- tests/operator-route-visual-contract.test.tsx tests/call-outcome-color.test.ts tests/call-review-ui.test.ts tests/customer-360-ui-contract.test.ts\`

Expected: FAIL because normal Order/Lead/Call status presentation still uses route-local colour utilities.

- [ ] **Step 3: Migrate orders and leads.**

Use \`PageHeader\`, \`Surface\`, \`Button\`, \`StatusBadge\`, \`StatusAlert\`, and \`MetricCard\` in all listed order and lead files. Rewrite page descriptions, filter labels, empty states, and action copy to be short and operational. Keep standard order states neutral; retain semantic colour only for delivered confirmation, actionable warning, cancellation/error, and destructive actions. Preserve all form labels, validation, routes, and server action calls.

- [ ] **Step 4: Migrate calls, calendar, and training.**

Apply the same primitives and copy rules to the listed call, calendar, and training files. Keep Call Outcome visibly meaningful through the shared semantic state contract. Preserve transcript, review, simulation, and role-boundary behavior exactly as existing tests require.

- [ ] **Step 5: Browser-check daily workflow routes.**

At one desktop viewport, inspect \`/orders\`, one order detail URL, \`/leads\`, \`/calls\`, \`/calendar\`, \`/training\`, and \`/training/reviews\`. Confirm page headers, filters, tables, forms, cards, and ordinary rows are neutral and visually match Operator Console surfaces. Trigger no persistence-changing action.

- [ ] **Step 6: Run operator-route tests.**

Run: \`npm test -- tests/operator-route-visual-contract.test.tsx tests/call-outcome-color.test.ts tests/call-review-ui.test.ts tests/call-review-page.test.ts tests/customer-360-ui-contract.test.ts tests/calendar-runtime.test.ts tests/training-api-routes.test.ts\`

Expected: PASS; no workflow or authorization contract regresses while route-local colour recipes disappear from normal states.

- [ ] **Step 7: Commit the daily operator family.**

~~~bash
git add src/app/orders src/components/orders src/app/leads src/components/leads src/app/calls src/components/calls src/app/calendar src/components/calendar src/app/training tests/operator-route-visual-contract.test.tsx tests/call-outcome-color.test.ts tests/call-review-ui.test.ts tests/call-review-page.test.ts tests/customer-360-ui-contract.test.ts tests/calendar-runtime.test.ts tests/training-api-routes.test.ts
git commit -m "style: align daily operator routes with console"
~~~

### Task 4: Management and administration route family

**Files:**
- Modify: \`src/app/products/page.tsx\`, \`src/components/products/ProductCard.tsx\`, \`src/components/products/ProductModal.tsx\`, \`src/components/products/ObjectionDrawer.tsx\`, \`src/components/products/ObjectionEditorModal.tsx\`, \`src/components/products/CallTranscriptUploaderModal.tsx\`
- Modify: \`src/app/team/page.tsx\`, \`src/components/team/TeamMembersPanel.tsx\`, \`src/components/team/TeamQueuePanel.tsx\`, \`src/app/wallet/page.tsx\`, \`src/components/wallet/WalletManagerPanel.tsx\`, \`src/app/readiness/page.tsx\`, \`src/components/readiness/WorkspaceReadinessPanel.tsx\`, \`src/app/telephony/page.tsx\`, \`src/components/telephony/TelephonyAdminPanel.tsx\`
- Modify: \`src/app/settings/page.tsx\`, \`src/app/settings/scripts/page.tsx\`, \`src/components/settings/ProductScriptManager.tsx\`, \`src/components/settings/TelephonyAdapterSettings.tsx\`, \`src/app/workflows/page.tsx\`, \`src/app/workflows/WorkflowsManagementClient.tsx\`, \`src/components/workflows/RuleBuilderModal.tsx\`
- Modify: \`src/app/monitor/page.tsx\`, \`src/app/monitor/TeamMonitorClient.tsx\`, \`src/app/audit/page.tsx\`, \`src/app/analytics/page.tsx\`, \`src/app/exceptions/page.tsx\`, \`src/components/exceptions/ExceptionQueue.tsx\`, \`src/app/objects/[slug]/page.tsx\`, \`src/components/schema/AddCustomFieldModal.tsx\`, \`src/components/schema/ObjectBuilderModal.tsx\`, \`src/components/blueprints/BlueprintPickerModal.tsx\`, \`src/components/views/FilterEngineBar.tsx\`, \`src/components/views/KanbanBoard.tsx\`, \`src/components/views/ViewSwitcher.tsx\`
- Create: \`tests/management-route-visual-contract.test.tsx\`
- Modify: \`tests/analytics-ui-contract.test.ts\`, \`tests/exception-queue-ui.test.ts\`, \`tests/local-sip-ui-contract.test.ts\`, \`tests/settings.test.ts\`, \`tests/telephony-admin-panel-contract.test.ts\`, \`tests/wallet-contract.test.ts\`, \`tests/workspace-readiness-ui-contract.test.ts\`, \`tests/workflow-ui-contract.test.ts\`

**Interfaces:**
- Consumes Task 1 primitives and Task 2 shell contract.
- Produces one management UI language while preserving role guards, simulation labeling, and server action boundaries.

- [ ] **Step 1: Write failing management rendering tests.**

~~~tsx
it("uses neutral shared metrics unless their value has semantic operational meaning", () => {
  expect(getMetricValueClassName("neutral")).toBe("text-zinc-100");
  expect(getMetricValueClassName("success")).toBe("text-emerald-200");
});

it("uses the shared danger recipe for destructive controls", () => {
  expect(getButtonClassName("danger")).toContain("bg-rose-950/20");
  expect(getButtonClassName("danger")).toContain("text-rose-200");
});
~~~

Extend existing management contracts to preserve exact role guards and test-only/simulation labels while visual components change.

- [ ] **Step 2: Run management tests and verify they fail.**

Run: \`npm test -- tests/management-route-visual-contract.test.tsx tests/analytics-ui-contract.test.ts tests/exception-queue-ui.test.ts tests/local-sip-ui-contract.test.ts tests/settings.test.ts tests/telephony-admin-panel-contract.test.ts tests/wallet-contract.test.ts tests/workspace-readiness-ui-contract.test.ts tests/workflow-ui-contract.test.ts\`

Expected: FAIL because management metrics and state panels still use route-local colour and surface recipes.

- [ ] **Step 3: Migrate product, team, wallet, readiness, and telephony routes.**

Adopt shared surfaces, buttons, status components, and metric cards in every listed file. Make catalog, balance, team, and readiness metrics neutral by default. Use semantic colours only for verified result, attention, failure, or destructive control. Keep management role checks, amount calculations, and test-call behavior unchanged.

- [ ] **Step 4: Migrate settings, workflows, monitor, audit, analytics, exceptions, and custom-object routes.**

Adopt the same primitives in every listed file, including modal and filter states. Shorten explanatory copy without removing truths such as \`Test-only simulation\`, server-controlled behavior, missing-data explanations, or role access messages. Use one \`StatusAlert\` recipe for matching semantic states rather than local amber/emerald/rose combinations.

- [ ] **Step 5: Browser-check administration routes.**

At one desktop viewport, inspect \`/products\`, \`/team\`, \`/wallet\`, \`/readiness\`, \`/telephony\`, \`/settings\`, \`/settings/scripts\`, \`/workflows\`, \`/monitor\`, \`/audit\`, \`/analytics\`, \`/exceptions\`, and one \`/objects/[slug]\` route. Confirm headers, panels, metrics, controls, alerts, and modals share Operator Console material and normal content stays neutral.

- [ ] **Step 6: Run management tests.**

Run: \`npm test -- tests/management-route-visual-contract.test.tsx tests/analytics-ui-contract.test.ts tests/exception-queue-ui.test.ts tests/local-sip-ui-contract.test.ts tests/settings.test.ts tests/telephony-admin-panel-contract.test.ts tests/wallet-contract.test.ts tests/workspace-readiness-ui-contract.test.ts tests/workflow-ui-contract.test.ts\`

Expected: PASS; management behavior, role boundaries, and simulation truthfulness remain intact.

- [ ] **Step 7: Commit the management family.**

~~~bash
git add src/app/products src/components/products src/app/team src/components/team src/app/wallet src/components/wallet src/app/readiness src/components/readiness src/app/telephony src/components/telephony src/app/settings src/components/settings src/app/workflows src/components/workflows src/app/monitor src/app/audit src/app/analytics src/app/exceptions src/components/exceptions src/app/objects src/components/schema src/components/blueprints src/components/views tests/management-route-visual-contract.test.tsx tests/analytics-ui-contract.test.ts tests/exception-queue-ui.test.ts tests/local-sip-ui-contract.test.ts tests/settings.test.ts tests/telephony-admin-panel-contract.test.ts tests/wallet-contract.test.ts tests/workspace-readiness-ui-contract.test.ts tests/workflow-ui-contract.test.ts
git commit -m "style: align management routes with console"
~~~

### Task 5: Entry, dashboard, and state completeness

**Files:**
- Modify: \`src/app/login/page.tsx\`, \`src/app/dashboard/page.tsx\`, \`src/components/dashboard/CallActivityChart.tsx\`, \`src/components/dashboard/KpiCards.tsx\`, \`src/components/dashboard/NextBestActionCard.tsx\`, \`src/components/dashboard/RecentActivityFeed.tsx\`, \`src/components/dashboard/ReorderWidget.tsx\`, \`src/components/dashboard/TeamLeaderDailyBriefCard.tsx\`, \`src/components/dashboard/TopPerformers.tsx\`
- Modify: \`src/components/workspace/CallbackScheduleModal.tsx\`, \`src/components/workspace/IncomingCallModal.tsx\`, \`src/components/workspace/PostCallSummaryCard.tsx\`, \`src/components/workspace/LeadNotesCard.tsx\`, \`src/components/workspace/CustomerTimelineCard.tsx\`, \`src/components/workspace/AdditionalQuestionsCard.tsx\`
- Create: \`tests/design-system-state-render.test.tsx\`
- Modify: \`tests/dashboard-ui-contract.test.ts\`, \`tests/login-role-entry.test.ts\`, \`tests/operator-next-action-ui-contract.test.ts\`, \`tests/recent-context.test.ts\`

**Interfaces:**
- Consumes all shared primitives and route-family contracts.
- Produces consistent loading, empty, unavailable, modal, success, warning, error, and narrow-layout treatment across entry, dashboard, and Operator Console supporting states.

- [ ] **Step 1: Write failing state rendering tests.**

~~~tsx
it("renders a warning alert with the sole shared warning recipe", () => {
  const markup = renderToStaticMarkup(<StatusAlert tone="warning">Callback is due</StatusAlert>);
  expect(markup).toContain("bg-amber-950/20");
  expect(markup).not.toContain("bg-amber-950/30");
});

it("renders a danger alert with the sole shared danger recipe", () => {
  const markup = renderToStaticMarkup(<StatusAlert tone="danger">Save failed</StatusAlert>);
  expect(markup).toContain("bg-rose-950/20");
  expect(markup).not.toContain("bg-rose-950/40");
});
~~~

- [ ] **Step 2: Run state tests and verify they fail.**

Run: \`npm test -- tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts\`

Expected: FAIL because loading/error/modal supporting components still render route-local alert and overlay opacity values.

- [ ] **Step 3: Migrate dashboard, login, and Operator Console supporting states.**

Use shared primitives for dashboard cards, login entry states, incoming-call/callback overlays, post-call summary, notes, timeline, and additional questions. Retain dashboard data/role boundaries and Workspace keyboard/call behavior. Keep normal metrics neutral; use colour only for shared semantic meanings.

- [ ] **Step 4: Check narrow layouts and state visibility.**

At narrow and desktop viewports, inspect \`/login\`, \`/dashboard\`, \`/workspace\`, \`/orders\`, \`/products\`, and \`/settings\`. Confirm no surface is cropped, action labels remain readable, focus-visible styling is present, and status alerts use the same opacity at both widths.

- [ ] **Step 5: Run entry, dashboard, and state tests.**

Run: \`npm test -- tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts tests/role-aware-home.test.ts\`

Expected: PASS; entry and dashboard behavior remains unchanged while all semantic alerts use shared recipes.

- [ ] **Step 6: Commit the state-completeness wave.**

~~~bash
git add src/app/login/page.tsx src/app/dashboard/page.tsx src/components/dashboard src/components/workspace/CallbackScheduleModal.tsx src/components/workspace/IncomingCallModal.tsx src/components/workspace/PostCallSummaryCard.tsx src/components/workspace/LeadNotesCard.tsx src/components/workspace/CustomerTimelineCard.tsx src/components/workspace/AdditionalQuestionsCard.tsx tests/design-system-state-render.test.tsx tests/dashboard-ui-contract.test.ts tests/login-role-entry.test.ts tests/operator-next-action-ui-contract.test.ts tests/recent-context.test.ts
git commit -m "style: complete shared operator console states"
~~~

### Task 6: Full verification, evidence, and priority handoff

**Files:**
- Create: \`docs/superpowers/reports/2026-09-11-unified-operator-console-design-system-verification.md\`
- Modify: \`PROJECT.md\`, \`README.md\`, \`docs/AKTUALNI_STAV_A_DESATERO.md\`, \`docs/README.md\`, \`docs/superpowers/plans/2026-09-11-operator-client-profile-and-verified-address.md\`

**Interfaces:**
- Consumes all five migration waves.
- Produces a browser-backed verification record and makes the Client Profile plan wait for this prerequisite.

- [ ] **Step 1: Run the full automated suite.**

Run: \`npm test\`

Run: \`npm run lint\`

Run: \`npm run typecheck\`

Run: \`npm run build\`

Run: \`git diff --check\`

Expected: every command exits \`0\`.

- [ ] **Step 2: Perform the final visual review.**

At the same desktop viewport, capture \`/workspace\`, \`/orders\`, \`/leads\`, \`/calls\`, \`/calendar\`, \`/training\`, \`/products\`, \`/team\`, \`/wallet\`, \`/readiness\`, \`/telephony\`, \`/settings\`, \`/workflows\`, \`/monitor\`, \`/audit\`, \`/analytics\`, \`/exceptions\`, \`/dashboard\`, and \`/login\`. At a narrow viewport capture \`/workspace\`, \`/orders\`, \`/products\`, \`/settings\`, and \`/login\`.

For every capture, verify shared page/inset surface, page header, primary/secondary action, normal metric, normal status, semantic alert, and focus state. Compare rendered pages with the approved Operator Console reference; source classes are not visual proof.

- [ ] **Step 3: Record outcome and update the single backlog order.**

Write the report with exact command exits, checked routes, viewport sizes, and unavailable data/routes. In \`docs/AKTUALNI_STAV_A_DESATERO.md\`, place the unified design-system prerequisite directly before Client Profile. In \`PROJECT.md\`, \`README.md\`, and \`docs/README.md\`, link the approved spec, this plan, and its verification report. In the Client Profile plan, add:

~~~md
**Required prerequisite:** Complete and verify \`docs/superpowers/plans/2026-09-11-unified-operator-console-design-system.md\` before starting Task 1.
~~~

- [ ] **Step 4: Commit final evidence and handoff.**

~~~bash
git add PROJECT.md README.md docs/AKTUALNI_STAV_A_DESATERO.md docs/README.md docs/superpowers/plans/2026-09-11-operator-client-profile-and-verified-address.md docs/superpowers/reports/2026-09-11-unified-operator-console-design-system-verification.md
git commit -m "docs: verify unified operator console design"
~~~

## Completion Definition

Every user-facing CRM route uses the approved Operator Console material and text hierarchy. Normal information is neutral; the single shared semantic recipes communicate confirmed completion, required attention, and risk. The full automated suite and route-by-route browser review demonstrate that this visual migration preserved existing CRM behavior. Only then may the Client Profile and verified-address plan continue.
