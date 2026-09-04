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
