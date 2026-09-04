# Task 3 Implementation Report

Date: 2026-09-04
Branch: `codex/p1-runtime-stability`
Baseline complete-work reference: `28560bffd7353491ec1a3c103a4aabae71511f36`
Scope: Calendar partial-failure resilience only. No Wallet or future-priority features were implemented.

## Summary

Implemented Calendar partial-failure resilience so callback and reminder sources now load independently and preserve successful data when the other source fails. Authorization, workspace, and validation failures still throw `DataAccessError` and continue to block the page/server action as before. Only independent source failures are converted into per-source unavailable status in the Calendar load result.

## Files Changed

- `src/lib/dal/calendar.ts`
- `src/app/actions/calendar.ts`
- `src/app/calendar/page.tsx`
- `src/components/calendar/OperatorCalendar.tsx`
- `src/components/dashboard/TeamLeaderDailyBriefCard.tsx`
- `src/components/dashboard/NextBestActionCard.tsx`
- `src/components/workspace/RecentContextRow.tsx`
- `tests/calendar-runtime.test.ts`

## Implementation Details

### Calendar DAL

- Added the required exported `CalendarSourceState` union and `CalendarLoadResult` interface exactly as specified.
- Added `buildCalendarLoadResult(...)` as a pure composition helper.
- Switched `listOperatorCalendarEntriesForWorkspace(...)` from `Promise.all(...)` to `Promise.allSettled(...)`.
- Preserved existing date-range validation and initial workspace guard.
- Preserved successful callback/reminder entries even when the peer source fails.
- Mapped rejected source results to `unavailable` only when the failure is an independent source failure:
  - `DataAccessError("DATABASE", ...)` becomes source-level unavailable with the original message.
  - non-database `DataAccessError` is rethrown unchanged.
  - unknown rejection types use the safe fallback message `Calendar source could not be loaded.`
- Continued sorting combined entries by `starts_at`.
- Did not fabricate substitute or synthetic entries.

### Server Action and Calendar UI

- Updated `listCalendarEntriesAction(...)` to return `Promise<CalendarLoadResult>`.
- Updated the Calendar page to render the full-page unavailable state only when the load still throws, which remains the path for auth/workspace/validation failures.
- Updated `OperatorCalendar` to:
  - keep the full `CalendarLoadResult` in client state for initial load and refreshes,
  - render available calendar entries normally,
  - show compact source-specific warnings when callbacks or reminders are unavailable,
  - preserve existing reminder mutation flows and server-side authorization behavior.

### Downstream Read-Only Consumers

These follow-up edits were necessary so the repo continued to typecheck after the Calendar action contract changed:

- `TeamLeaderDailyBriefCard` now reads `calendarResult.value.entries` and truthfully carries Calendar source warnings into the brief warnings list.
- `NextBestActionCard` now reads callback signals from `calendarResult.entries`.
- `RecentContextRow` now reads callback context from `calendarResult.entries`.

No Wallet logic or future-priority behavior was added.

## Test-First Evidence

### Red

Added `tests/calendar-runtime.test.ts` first and ran:

`npm test -- tests/calendar-runtime.test.ts`

Initial result: failed because `buildCalendarLoadResult` did not exist yet.

### Green

Implemented the minimal production changes, then reran:

`npm test -- tests/calendar-runtime.test.ts`

Result: passed.

## Focused Verification

Executed the required focused checks after implementation:

- `npm test -- tests/calendar-runtime.test.ts tests/operator-next-action-ui-contract.test.ts tests/lead-queue-contract.test.ts`
- `npm run lint`
- `npm run typecheck`

Results:

- Focused tests passed (`3` files, `14` tests).
- Lint passed.
- Typecheck passed.

## Constraint Audit

- Preserved server-side workspace/role guards.
- Preserved thrown `DataAccessError` behavior for authorization/validation failures.
- Limited partial unavailable mapping to independent source failures.
- Did not fabricate empty replacement data.
- Did not weaken reminder mutation authorization.
- Did not touch demo-auth scope.
- Did not rewrite migration evidence in `docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md`.
- Preserved untracked `Review.md` and the untracked plan file.
- Did not stage unrelated files.

## Self-Review Notes

- Verified that the callback-only `listScheduledCallbacksAction(...)` contract remains unchanged.
- Verified that the Calendar page still hard-fails only when the load throws, which is now limited to non-partial failure cases such as auth/workspace/validation failures.
- Verified that downstream readers of `listCalendarEntriesAction(...)` were updated so the new return shape does not cause type or runtime drift elsewhere in the slice.

## Commit

Requested commit message:

`fix: keep calendar data available on partial failure`

---

## Fix Round 1

Date: 2026-09-04
Base commit for this fix round: `74d132ce8659ddf5ba60f39ece87e33f2afbd37e`

### Reviewer Findings Addressed

1. `NextBestActionCard` no longer treats callback-source failure as an ordinary empty callback list. It now resolves an explicit unavailable state from the Calendar result and renders that state instead of falling through to reorder or queue.
2. `RecentContextRow` no longer collapses callback-source failure into `activeCallback: null` and “No record.” It now preserves callback-source unavailability through a calendar-aware recent-context helper and renders a truthful unavailable callback signal.
3. `buildCalendarLoadResult(...)` now has a focused regression test proving that non-`DATABASE` `DataAccessError` values remain thrown rather than becoming partial unavailable.

### Files Changed In Fix Round 1

- `src/lib/nextBestAction.ts`
- `src/components/dashboard/NextBestActionCard.tsx`
- `src/components/workspace/recentContext.ts`
- `src/components/workspace/RecentContextRow.tsx`
- `tests/next-best-action.test.ts`
- `tests/recent-context.test.ts`
- `tests/calendar-runtime.test.ts`

### TDD Evidence

Added the following failing tests first:

- `tests/next-best-action.test.ts` for callback-source unavailable state
- `tests/recent-context.test.ts` for callback-source unavailable state
- `tests/calendar-runtime.test.ts` for thrown non-database `DataAccessError`

Initial red run:

```text
> countdown-crm@0.1.0 test
> vitest run tests/next-best-action.test.ts tests/recent-context.test.ts tests/calendar-runtime.test.ts


 RUN  v4.1.11 C:/Users/mikes/.projects/countdown-crm/.worktrees/codex-p1-runtime

 ❯ tests/recent-context.test.ts (3 tests | 1 failed) 14ms
     × preserves callback-source unavailability instead of reporting no active callback 6ms
 ❯ tests/next-best-action.test.ts (4 tests | 1 failed) 10ms
     × keeps the next-best-action card unavailable when the callback source is unavailable 4ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/next-best-action.test.ts > next best action > keeps the next-best-action card unavailable when the callback source is unavailable
TypeError: resolveNextBestActionState is not a function

 FAIL  tests/recent-context.test.ts > recent context > preserves callback-source unavailability instead of reporting no active callback
TypeError: buildRecentContextFromCalendar is not a function
```

### Actual Verification Output

Focused tests:

```text
> countdown-crm@0.1.0 test
> vitest run tests/calendar-runtime.test.ts tests/next-best-action.test.ts tests/recent-context.test.ts tests/operator-next-action-ui-contract.test.ts tests/lead-queue-contract.test.ts


 RUN  v4.1.11 C:/Users/mikes/.projects/countdown-crm/.worktrees/codex-p1-runtime


 Test Files  5 passed (5)
      Tests  22 passed (22)
   Start at  17:07:06
   Duration  796ms (transform 615ms, setup 0ms, import 1.09s, tests 72ms, environment 1ms)
```

Lint:

```text
> countdown-crm@0.1.0 lint
> eslint src tests vitest.config.mts
```

Typecheck:

```text
> countdown-crm@0.1.0 typecheck
> tsc --noEmit
```

### Constraint Audit For Fix Round 1

- Callback-only `listScheduledCallbacksAction(...)` remains unchanged.
- Workspace and role guards remain server-authoritative.
- No callback failure is misrepresented as ordinary empty data in the fixed downstream consumers.
- No Wallet or future-priority work was added.
- Preserved untracked `Review.md` and the untracked plan file.
