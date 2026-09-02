# Call/order workflow evidence — 2. 9. 2026

## Scope

Task 0: read-only baseline of the current call/order lifecycle before any
Floating Call Controller work. No product code, migration, database write,
demo authentication, fixture identity, or provider integration was added.

## Repository baseline

- Branch: `audit/pilot-call-order-baseline`
- Base: `e307aa7` (`feat: add customer 360 retention playbook`)
- Remote divergence at start: `0/0` against `origin/main`
- Local pre-existing working-copy changes were preserved: deleted `AGENTS.md`,
  modified `README.md`, and untracked `PROJECT.md`.
- Next.js development server: `http://localhost:3000`

## Static call contract

The current implementation has two separate state boundaries:

1. `src/lib/telephony/softphone.ts` owns the browser simulation states
   `idle`, `dialing`, `ringing`, `connected`, `on_hold` and `ended`, including
   the elapsed timer, mute, hold, hangup and dial cancellation.
2. `src/lib/dal/leadQueue.ts` and
   `src/lib/dal/callCompletion.ts` own authenticated workspace assignment,
   durable call/outcome/order completion and workflow dispatch.

The outbound softphone path initializes audio before scheduling ringing or
connected transitions. If initialization fails or times out, the dial is
cancelled and the local session returns to `idle`; delayed timers cannot later
connect the call. This behavior is covered by
`tests/softphone-lifecycle.test.ts`.

Durable operator completion calls
`complete_lead_call_with_order_items`, then dispatches `on_call_ended` using
the durable call id. Workflow results distinguish success, failure,
unavailable and simulation. `on_call_ended` is the only production-supported
server trigger in the current dispatcher; other trigger types remain
unavailable until a real event source exists.

## Browser evidence

The initial fresh Playwright session had no authenticated cookies. Opening
`/workspace` therefore redirected to `/login`. No credentials were entered in
that first checkpoint because demo authentication and new test identities are
out of scope.

After the user authenticated an existing Operator session, `/workspace`
loaded successfully:

- URL: `http://localhost:3000/workspace`
- Identity shown: `mikestudio`, role `Operator`.
- Operator status shown: `Ready for Calls`.
- After reload and settling, the page remained authenticated and showed
  `Operator Console waiting for assignment`.
- Snapshot: `output/playwright/task0-authenticated-waiting-20260902-final.yml`
- Screenshot: `output/playwright/task0-authenticated-waiting-20260902-final.png`
- Console errors after the settled reload: 0.

The authenticated UI did not expose a lead or call controls. It explicitly
reported that no callable contact is currently assigned; Operators cannot
browse or choose from the lead directory.

## Read-only persistence boundary

Read-only SQL inspection of the linked Supabase project found:

- `public.lead_queue_items`: 1 row, state `closed`; no `available` queue item;
- `public.leads`: 4 rows;
- `public.calls`: 21 rows.

No database write, queue mutation, fixture insertion or migration was
performed during this run.

## Verification status

Passed locally on the current code baseline:

- targeted call/workflow tests: 5 files, 18 tests;
- full Vitest suite: 29 files, 121 tests;
- ESLint;
- TypeScript check;
- production build.
- authenticated Operator `/workspace` load;
- authenticated session survival across a reload;
- truthful waiting-for-assignment state;
- read-only queue state confirmation.

Not verified in this run:

- server-provided assignment;
- call start with the real authorized session;
- active call, timer, mute/hold and hangup browser behavior;
- outcome, callback or order completion in the browser;
- post-call next-lead routing after a real completion;
- reload persistence and read-only SQL read-back;
- negative role/workspace or direct RLS denial.

## Result and blocker

The code-level contract has a truthful audio/provider failure path and a
server-authoritative completion path. The authenticated browser boundary is
available, but the linked environment currently has no callable assignment,
so the call/order workflow cannot proceed without fabricating or mutating
data. This document remains an interim evidence checkpoint, not a pilot-ready
claim and not approval to begin the Floating Call Controller.

Next safe step: make an existing queue item callable through the supported
workspace/routing workflow, then rerun the same browser matrix in this
authorized Operator session. Do not seed a fixture or bypass RLS for this
evidence run.
