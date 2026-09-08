# P1 Recent Context Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every valid Recent Context signal when an independent activities or calendar source is unavailable, while keeping fatal workspace/auth/validation failures fatal and marking stale data honestly.

**Architecture:** Keep the pure signal-selection logic in `recentContext.ts`, but introduce an explicit loader/source-state boundary instead of treating all loader failures as one `catch`. Activities and calendar are independent sources: a database/operational failure in one source yields a partial result, two verified empty results yield empty, and two operational failures yield unavailable. `RecentContextRow` renders source state and refresh staleness; it never converts a fatal `DataAccessError` into partial UI.

**Tech Stack:** Next.js App Router, React, TypeScript, Server Actions, Supabase DAL, Vitest.

**Spec:** `docs/AKTUALNI_STAV_A_DESATERO.md` (P1.1, partial-failure truthfulness) plus the approved Sol source-state specification required by the execution request before implementation begins.

## Global Constraints

- Do not begin implementation until the path to Sol's approved shared P1 source-state specification is supplied and the source-state contract is explicitly approved.
- Do not modify `NextBestActionCard.tsx`, `nextBestAction.ts`, reorder DAL/helpers, shared navigation, Analytics, Team Queue, or any Sol-owned file.
- Preserve server workspace/auth/validation guards; `FORBIDDEN`, `AUTH`, `WORKSPACE`, and `VALIDATION` errors remain fatal.
- Never use `0`, `[]`, `null`, or a successful-looking empty state to represent an unavailable source.
- A refresh may retain previously valid data only with an explicit stale/unavailable marker; it must not present retained data as fresh.
- Do not add a generic data-loading framework.

---

### Task 1: Lock the source-state contract in pure Recent Context tests

**Files:**
- Modify: `tests/recent-context.test.ts`
- Test: `src/components/workspace/recentContext.ts` via its exported pure functions

**Interfaces:**
- Consumes: `WorkspaceActivity[]`, `CalendarLoadResult`, `CalendarSourceState`, and the approved source-state classification from Sol's specification.
- Produces: Executable examples for `buildRecentContextFromCalendar` and the new loader result shape that Task 2 must implement.

- [ ] **Step 1: Write the failing tests**

Add one test per contract state, using `DataAccessError` only for the fatal cases and plain rejected promises only for operational failures:

```ts
it("keeps valid activities when the calendar source is unavailable", () => {
  const result = buildRecentContextFromSources({
    activities: { state: "available", value: activities },
    calendar: { state: "unavailable", message: "Calendar temporarily unavailable." },
    leadId: "lead-1",
    now: Date.parse("2026-08-31T00:00:00.000Z"),
  });

  expect(result.state).toBe("partial");
  expect(result.context.lastContact?.activity.id).toBe("call-latest");
  expect(result.context.activeCallback).toBeNull();
  expect(result.unavailableSources).toEqual(["calendar"]);
});

it("keeps valid calendar callbacks when activities are unavailable", () => {
  const result = buildRecentContextFromSources({
    activities: { state: "unavailable", message: "Activities temporarily unavailable." },
    calendar: { state: "available", entries: callbackEntries },
    leadId: "lead-1",
    now: Date.parse("2026-08-31T00:00:00.000Z"),
  });

  expect(result.state).toBe("partial");
  expect(result.context.activeCallback?.id).toBe("callback-active");
  expect(result.context.lastContact).toBeNull();
  expect(result.unavailableSources).toEqual(["activities"]);
});

it("returns empty only when both sources are verified empty", () => {
  const result = buildRecentContextFromSources({
    activities: { state: "empty", value: [] },
    calendar: { state: "empty", entries: [] },
    leadId: "lead-empty",
  });

  expect(result.state).toBe("empty");
  expect(result.context).toEqual({ lastContact: null, lastCallResult: null, lastOrder: null, activeCallback: null });
  expect(result.unavailableSources).toEqual([]);
});

it("returns unavailable when both operational sources fail", () => {
  const result = buildRecentContextFromSources({
    activities: { state: "unavailable", message: "Activities failed." },
    calendar: { state: "unavailable", message: "Calendar failed." },
    leadId: "lead-1",
  });

  expect(result.state).toBe("unavailable");
  expect(result.context).toBeNull();
  expect(result.unavailableSources).toEqual(["activities", "calendar"]);
});
```

Add fatal propagation tests that assert `DataAccessError("FORBIDDEN")` and `DataAccessError("VALIDATION")` are thrown rather than converted into `unavailable`.

- [ ] **Step 2: Run the focused test to verify it fails for the missing contract**

Run: `npm test -- tests/recent-context.test.ts`

Expected: FAIL because `buildRecentContextFromSources` and its source-state result type do not exist; no production implementation is written yet.

- [ ] **Step 3: Commit the red contract tests**

```powershell
git add tests/recent-context.test.ts
git commit -m "test: define recent context source states"
```

### Task 2: Implement the minimal pure source-state reducer

**Files:**
- Modify: `src/components/workspace/recentContext.ts` (`buildRecentContextFromCalendar` and new `buildRecentContextFromSources`)
- Modify: `tests/recent-context.test.ts`

**Interfaces:**
- Consumes: `RecentContextSource<T> = { state: "available" | "empty" | "unavailable"; value?: T; message?: string }` as approved by Sol; callback entries remain derived from `CalendarLoadResult.entries`.
- Produces: `buildRecentContextFromSources(input): RecentContextLoadResult`, where `state` is `"fresh" | "partial" | "empty" | "unavailable"`, `context` is `RecentContextData | null`, `unavailableSources` is `("activities" | "calendar")[]`, and source messages are retained for UI.

- [ ] **Step 1: Write the failing edge-case tests**

Add tests proving that an available empty activities source is not the same as an unavailable activities source, and that callback-source unavailability is preserved while activity data remains usable. Assert no branch substitutes `[]` for an unavailable source in the returned metadata.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm test -- tests/recent-context.test.ts`

Expected: FAIL on the new state/metadata assertions, not on a test import or syntax error.

- [ ] **Step 3: Write the minimal implementation**

Implement only the reducer needed by the tests:

```ts
export type RecentContextLoadState = "fresh" | "partial" | "empty" | "unavailable";

export interface RecentContextLoadResult {
  state: RecentContextLoadState;
  context: RecentContextData | null;
  unavailableSources: Array<"activities" | "calendar">;
  messages: Partial<Record<"activities" | "calendar", string>>;
}

export function buildRecentContextFromSources(input: RecentContextSourcesInput): RecentContextLoadResult {
  const unavailableSources = (Object.entries(input.sources)
    .filter(([, source]) => source.state === "unavailable")
    .map(([name]) => name)) as Array<"activities" | "calendar">;

  if (unavailableSources.length === 2) {
    return { state: "unavailable", context: null, unavailableSources, messages: collectMessages(input.sources) };
  }

  const context = buildRecentContext(
    input.leadId,
    input.activities.state === "available" || input.activities.state === "empty" ? input.activities.value : [],
    input.calendar.state === "available" || input.calendar.state === "empty" ? callbacksFromCalendar(input.calendar) : [],
    input.now,
  );

  return {
    state: unavailableSources.length ? "partial" : hasAnySignal(context) ? "fresh" : "empty",
    context,
    unavailableSources,
    messages: collectMessages(input.sources),
  };
}
```

The actual implementation must preserve the approved discriminated-union types and must rethrow auth/workspace/validation errors before the reducer is called. Do not add a catch-all here.

- [ ] **Step 4: Run the focused tests and the existing Recent Context suite**

Run: `npm test -- tests/recent-context.test.ts`

Expected: all Recent Context tests PASS, including the original callback-source behavior and every new source-state case.

- [ ] **Step 5: Commit the pure reducer**

```powershell
git add src/components/workspace/recentContext.ts tests/recent-context.test.ts
git commit -m "feat: preserve recent context partial data"
```

### Task 3: Add a guarded loader and honest refresh behavior

**Files:**
- Modify: `src/components/workspace/RecentContextRow.tsx` (`loadContext` and rendered state boundary)
- Create: `tests/recent-context-loader.test.ts`
- Create only if needed by the approved contract: `src/components/workspace/recentContextLoader.ts`

**Interfaces:**
- Consumes: `getLeadActivities(leadId)`, `listCalendarEntriesAction()`, `buildRecentContextFromSources`, and the existing `DataAccessError` classification.
- Produces: a loader result consumed by `RecentContextRow` with source state, messages, and `isStale`/`refreshTimestamp` metadata; fatal errors are rejected.

- [ ] **Step 1: Write the failing loader and refresh tests**

Test with real small resolver functions (mock only the two server boundaries if the test environment cannot import server actions):

```ts
it("keeps activities when calendar rejects operationally", async () => {
  const result = await loadRecentContext("lead-1", {
    loadActivities: async () => activities,
    loadCalendar: async () => { throw new Error("Calendar temporarily unavailable."); },
  });

  expect(result.state).toBe("partial");
  expect(result.context?.lastContact?.activity.id).toBe("call-latest");
  expect(result.messages.calendar).toContain("Calendar");
});

it("rethrows forbidden and validation errors", async () => {
  await expect(loadRecentContext("lead-1", {
    loadActivities: async () => { throw new DataAccessError("FORBIDDEN", "Forbidden"); },
    loadCalendar: async () => ({ entries: [], sources: { callbacks: { state: "available" }, reminders: { state: "available" } } }),
  })).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("marks retained context stale during a refresh", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/workspace/RecentContextRow.tsx"), "utf8");
  expect(source).toContain("stale");
  expect(source).toContain("Unavailable");
});
```

- [ ] **Step 2: Run the new loader test and verify it fails**

Run: `npm test -- tests/recent-context-loader.test.ts`

Expected: FAIL because the loader and explicit stale marker do not exist.

- [ ] **Step 3: Implement the minimal loader and component state transitions**

Use `Promise.allSettled` only around the two independent operational sources. For each rejected promise, rethrow `DataAccessError` codes `AUTH`, `FORBIDDEN`, `WORKSPACE`, and `VALIDATION`; classify only database/operational errors as `unavailable`. On refresh, retain the last valid `context` only while rendering `Refreshing…` or `Data may be stale` and the affected source message. A fatal error clears the partial surface and renders the existing alert boundary.

- [ ] **Step 4: Run focused, full, and static checks**

Run: `npm test -- tests/recent-context.test.ts tests/recent-context-loader.test.ts`

Expected: PASS with the partial, empty, unavailable, fatal, and stale cases covered.

- [ ] **Step 5: Commit the loader slice**

```powershell
git add src/components/workspace/RecentContextRow.tsx src/components/workspace/recentContext.ts tests/recent-context.test.ts tests/recent-context-loader.test.ts
git commit -m "fix: make recent context failures truthful"
```

### Task 4: Gate, verify, and hand off

**Files:**
- Modify only if required by verification: `src/components/workspace/RecentContextRow.tsx`, `src/components/workspace/recentContext.ts`, and their focused tests

**Interfaces:**
- Consumes: the approved Sol source-state specification and the loader/reducer contracts from Tasks 1–3.
- Produces: focused verification evidence and a handoff to Sol if implementation requires a shared type or file outside this plan's scope.

- [ ] **Step 1: Stop and report any shared-contract dependency**

If the approved source-state specification requires editing a shared type, `NextBestActionCard.tsx`, `nextBestAction.ts`, navigation, Analytics, Team Queue, or reorder helpers, do not edit it. Record the exact failing test and proposed interface in the handoff.

- [ ] **Step 2: Run the complete applicable verification**

Run: `npm test -- tests/recent-context.test.ts tests/recent-context-loader.test.ts && npm run lint && npm run typecheck && git diff --check`

Expected: exit 0, with all named tests passing and no diff whitespace errors. Do not claim broader application/build coverage unless freshly run.

- [ ] **Step 3: Commit the verified slice**

```powershell
git add src/components/workspace/RecentContextRow.tsx src/components/workspace/recentContext.ts tests/recent-context.test.ts tests/recent-context-loader.test.ts
git commit -m "fix: stabilize recent context source failures"
```

