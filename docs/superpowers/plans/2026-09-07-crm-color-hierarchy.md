# CRM Color Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Countdown CRM calmer by reserving color for meaningful operational states and neutralizing decorative accents.

**Architecture:** Keep the existing dark zinc design language and Tailwind utility approach. Update shared `PageHeader` tone classes, centralize Call Outcome tones in a pure helper, and neutralize a small set of high-visibility workspace components; preserve semantic colors in outcomes, errors, readiness, live telephony, wallet polarity, and training states.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 utilities, Vitest, ESLint, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-07-crm-color-hierarchy-design.md`

## Global Constraints

- No new UI dependency or theme system.
- No data, routing, role, or copy changes.
- Color remains available for Call Outcome and other important operational states.
- Work inline in the current worktree; do not dispatch agents.
- Every production change follows a failing-test-first cycle.

### Task 1: Lock the color hierarchy with focused tests

**Files:**
- Create: `tests/crm-color-hierarchy.test.ts`
- Create: `tests/call-outcome-color.test.ts`
- Test: `src/components/layout/PageHeader.tsx`, `src/app/globals.css`, `src/components/workspace/ConversationBriefCard.tsx`, `src/components/workspace/ClientProfileCard.tsx`, `src/components/workspace/CallbackScheduleModal.tsx`, `src/components/calls/CallDetailDrawer.tsx`, `src/components/calls/CallReviewWorkspace.tsx`, `src/lib/callOutcomeStyles.ts`

- [x] **Step 1: Write failing assertions**

Assert that the shared badge success/warning treatments are subdued, that the scoped decorative workspace surfaces use zinc classes, and that the call outcome source still contains its semantic selected-state treatment.

- [x] **Step 2: Run the focused test**

Run: `npm test -- --run tests/crm-color-hierarchy.test.ts`

Expected: FAIL because the current source still uses saturated decorative sky/emerald treatments.

### Task 2: Tone down shared and workspace decoration

**Files:**
- Modify: `src/components/layout/PageHeader.tsx`
- Modify: `src/app/globals.css`
- Create: `src/lib/callOutcomeStyles.ts`
- Modify: `src/app/calls/page.tsx`
- Modify: `src/components/workspace/ConversationBriefCard.tsx`
- Modify: `src/components/workspace/ClientProfileCard.tsx`
- Modify: `src/components/workspace/CallbackScheduleModal.tsx`
- Modify: `src/components/calls/CallDetailDrawer.tsx`
- Modify: `src/components/calls/CallReviewWorkspace.tsx`
- Modify: `tests/header-foundation.test.ts`

- [x] **Step 1: Replace decorative surfaces with zinc**

Use neutral zinc surfaces for the Conversation Brief container, its server-context badge, safe-next-step card, Client Profile avatar and score bar, callback modal icon, and ordinary Call Review informational notice.

- [x] **Step 2: Reduce shared PageHeader badge saturation**

Keep warning and success tone distinctions but use lower-opacity backgrounds/borders and less bright text so badges read as status metadata rather than primary controls.

- [x] **Step 3: Keep important action emphasis**

Retain the Call Logs review link and selected Call Outcome color; only change decorative surfaces and non-semantic informational framing.

- [x] **Step 4: Run focused tests**

Run: `npm test -- --run tests/crm-color-hierarchy.test.ts`

Expected: PASS.

### Task 3: Verify the CRM-wide pass

**Files:**
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md`

- [x] **Step 1: Run all automated checks**

Run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`.

- [x] **Step 2: Run browser spot checks**

Inspect representative dashboard, workspace, Call Logs, Team Leader Review, readiness, and settings surfaces. Confirm that outcomes/errors/important states retain color while ordinary cards and labels are mostly zinc.

- [x] **Step 3: Document the design rule**

Update the project status docs with the color hierarchy and the surfaces intentionally left semantic.

- [x] **Step 4: Commit**

```bash
git add docs PROJECT.md src/components tests/crm-color-hierarchy.test.ts
git commit -m "refactor: quiet decorative crm colors"
```
