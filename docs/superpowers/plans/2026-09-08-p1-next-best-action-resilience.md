# P1 Next Best Action Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve truthful callback or reorder guidance through one operational source failure without presenting an unverified fallback as the definitive next best action.

**Architecture:** A pure resolver consumes explicit callback and reorder source states and owns the priority semantics. A server action loads both sources with `Promise.allSettled`, converts only `DataAccessError("DATABASE")` into source unavailability, and rethrows every other failure. The client card renders ready, partial, and unavailable results without independently classifying server errors.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Supabase DAL, Vitest

**Spec:** `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md`

## Global Constraints

- Scheduled callbacks outrank reorder estimates when due within 24 hours.
- A lower-priority signal may be shown during a higher-priority source outage only as a partial recommendation with an explicit warning.
- The lead queue fallback is ready only when both callback and reorder sources are available and contain no actionable signal.
- Only `DataAccessError("DATABASE")` becomes source unavailability; `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, and `CONFLICT` are rethrown.
- No calendar reminder result influences Next Best Action.
- No synthetic callback, reorder, queue priority, lead name, or product name is created.

---

### Task 1: Define the priority truth table in pure tests

**Files:**
- Modify: `tests/next-best-action.test.ts`
- Test: `src/lib/nextBestAction.ts`

**Interfaces:**
- Consumes: `NextBestActionSource<T> = { state: "available"; data: T } | { state: "unavailable"; message: string }`
- Produces: `resolveNextBestActionState(callbacks, reorders, now): NextBestActionState`

- [ ] **Step 1: Replace the obsolete all-unavailable assertion with table-driven failing tests**

Cover these literal outcomes:

```ts
const cases = [
  { callbacks: "available-due", reorders: "unavailable", status: "partial", kind: "callback" },
  { callbacks: "unavailable", reorders: "available-urgent", status: "partial", kind: "reorder" },
  { callbacks: "available-empty", reorders: "unavailable", status: "unavailable", kind: null },
  { callbacks: "unavailable", reorders: "available-empty", status: "unavailable", kind: null },
  { callbacks: "available-empty", reorders: "available-empty", status: "ready", kind: "queue" },
  { callbacks: "unavailable", reorders: "unavailable", status: "unavailable", kind: null },
];
```

For every partial result, assert the action kind and exact unavailable source list. For unavailable results, assert `action` is absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/next-best-action.test.ts`

Expected: FAIL because the current resolver accepts a calendar aggregate plus a plain reorder array and cannot represent reorder unavailability or partial guidance.

- [ ] **Step 3: Commit the red contract test**

```text
git add tests/next-best-action.test.ts
git commit -m "test: define next best action partial states"
```

### Task 2: Implement the pure source-state resolver

**Files:**
- Modify: `src/lib/nextBestAction.ts`
- Modify: `tests/next-best-action.test.ts`

**Interfaces:**
- Consumes: explicit callback and reorder `NextBestActionSource` values
- Produces: `NextBestActionState` with `ready`, `partial`, or `unavailable`

- [ ] **Step 1: Add one failing test for a future callback plus available urgent reorder**

Expected literal result: `ready` reorder, because the available callback source proves no callback is due inside the priority window.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/next-best-action.test.ts`

Expected: FAIL on the missing source-state interface, not on fixture syntax.

- [ ] **Step 3: Implement the minimal resolver**

Use these public types:

```ts
export type NextBestActionSource<T> =
  | { state: "available"; data: T }
  | { state: "unavailable"; message: string };

export type NextBestActionState =
  | { status: "ready"; action: NextBestAction }
  | { status: "partial"; action: NextBestAction; unavailableSources: Array<"callbacks" | "reorders">; message: string }
  | { status: "unavailable"; unavailableSources: Array<"callbacks" | "reorders">; message: string };
```

First calculate an action only from available data. A due callback is usable whenever callbacks are available. A reorder is definitive only when callbacks are available; with callbacks unavailable it is partial. Queue is valid only when both sources are available. If the only available source has no actionable signal, return unavailable rather than fabricating queue priority.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/next-best-action.test.ts`

Expected: all Next Best Action priority and failure combinations pass.

- [ ] **Step 5: Commit the resolver**

```text
git add src/lib/nextBestAction.ts tests/next-best-action.test.ts
git commit -m "feat: resolve next actions from partial sources"
```

### Task 3: Add the server-side source loader

**Files:**
- Create: `src/app/actions/nextBestAction.ts`
- Create: `tests/next-best-action-action.test.ts`

**Interfaces:**
- Consumes: `listScheduledCallbacksForWorkspace`, `getReorderOpportunities`, `DataAccessError`, and `resolveNextBestActionState`
- Produces: `loadNextBestActionAction(): Promise<NextBestActionState>`

- [ ] **Step 1: Write failing action tests**

Test these boundaries with complete fixtures:

- callback `DATABASE` plus successful reorder returns partial reorder,
- reorder `DATABASE` plus a due callback returns partial callback,
- `FORBIDDEN` from either source rejects with `FORBIDDEN`,
- `VALIDATION` from either source rejects with `VALIDATION`,
- an unknown rejection is rethrown rather than converted to partial state.

- [ ] **Step 2: Run the action test and verify RED**

Run: `npm test -- tests/next-best-action-action.test.ts`

Expected: FAIL because `loadNextBestActionAction` does not exist.

- [ ] **Step 3: Implement the minimal server action**

Load callbacks for the same default window previously supplied by calendar: seven days before now through fourteen days after now. Load callbacks and reorder opportunities via `Promise.allSettled`. Convert a rejected result only when `isDataAccessError(reason) && reason.code === "DATABASE"`; otherwise throw the original reason. Map successful callback DTOs to `NextBestActionCallback` without loading personal reminders.

- [ ] **Step 4: Run action and resolver tests**

Run: `npm test -- tests/next-best-action.test.ts tests/next-best-action-action.test.ts`

Expected: all source combinations and fatal-error propagation tests pass.

- [ ] **Step 5: Commit the server boundary**

```text
git add src/app/actions/nextBestAction.ts tests/next-best-action-action.test.ts
git commit -m "feat: isolate next action source failures"
```

### Task 4: Render partial guidance truthfully

**Files:**
- Modify: `src/components/dashboard/NextBestActionCard.tsx`
- Create: `tests/next-best-action-card.test.tsx`

**Interfaces:**
- Consumes: `loadNextBestActionAction` and `NextBestActionState`
- Produces: an interactive card that shows an action plus warning for partial state, an action without warning for ready state, and no action for unavailable state

- [ ] **Step 1: Write failing render tests against an exported presentational component**

Render real markup and assert:

- partial reorder contains the reorder title, link, and callback-unavailable warning,
- partial callback contains the callback title, link, and reorder-unavailable warning,
- unavailable contains no `Open action` link,
- ready queue contains the `/workspace` action and no unavailability warning.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- tests/next-best-action-card.test.tsx`

Expected: FAIL because the presentational state boundary and partial rendering do not exist.

- [ ] **Step 3: Implement the minimal component change**

Export a presentation-only `NextBestActionContent({ state })` from the card module. `NextBestActionCard` keeps cancellation/loading state, calls only `loadNextBestActionAction`, and stores the returned discriminated union. A rejected action call uses the existing generic unavailable wording and never attempts client-side error classification.

- [ ] **Step 4: Run focused and dashboard tests**

Run: `npm test -- tests/next-best-action.test.ts tests/next-best-action-action.test.ts tests/next-best-action-card.test.tsx tests/dashboard-ui-contract.test.ts`

Expected: all tests pass and the dashboard continues to render the card.

- [ ] **Step 5: Commit the card**

```text
git add src/components/dashboard/NextBestActionCard.tsx tests/next-best-action-card.test.tsx
git commit -m "fix: render partial next action guidance"
```

### Task 5: Verify and hand off

**Files:**
- Verify: all files from Tasks 1-4

**Interfaces:**
- Consumes: the completed resolver, action, and card
- Produces: a clean commit chain with fresh verification evidence

- [ ] **Step 1: Run focused tests**

Run: `npm test -- tests/next-best-action.test.ts tests/next-best-action-action.test.ts tests/next-best-action-card.test.tsx tests/dashboard-ui-contract.test.ts`

- [ ] **Step 2: Run full verification**

Run:

```text
npm test
npm run check
git diff --check
```

Expected: every command exits zero.

- [ ] **Step 3: Review the final diff**

Confirm no personal reminder dependency, no synthetic fallback, no client-side authorization downgrade, and no unrelated dashboard or reorder behavior change.

