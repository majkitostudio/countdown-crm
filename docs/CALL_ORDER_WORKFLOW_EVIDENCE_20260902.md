# Call/order workflow evidence — 2. 9. 2026

## Scope

Task 0: baseline of the current call/order lifecycle before any Floating Call
Controller work. No product code, migration, direct SQL write, demo
authentication, fixture identity, or provider integration was added. The
approved browser call-start attempt invoked the existing server RPC and its
recovery path.

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

After an existing queue item was assigned to the Operator through the
supported admin workflow, the same session showed `Playwright Test Lead` and
the `Call Client` control. The call-start attempt reached the server action
successfully, but browser audio initialization failed. The UI showed
`Call could not be started: Audio session could not be initialized`, returned
to `Ready for assignment`, and the server recovery action completed. No
delayed transition to an active call was observed.

- Recovery snapshot: `output/playwright/task0-assigned-audio-recovery-20260902.yml`
- Recovery screenshot: `output/playwright/task0-assigned-audio-recovery-20260902.png`
- The Playwright session retains historical 500 responses from the period when
  the dev server was restarted; the settled reload and call recovery produced
  no new browser error.

## Read-only persistence boundary

Read-only SQL inspection of the linked Supabase project found before the
manual assignment:

- `public.lead_queue_items`: 1 row, state `closed`;
- `public.leads`: 4 rows;
- 3 leads without any queue item.
- `public.calls`: 21 rows.

After the supported admin assignment and the failed call-start recovery, the
single queue item was back in state `assigned`. No direct SQL write, fixture
insertion or migration was performed during this run.

## Routing and recovery gaps observed

The reported admin behavior is explained by the current data model and UI:

- `TeamQueuePanel` lists `lead_queue_items`, not every row in `leads`.
  Therefore only leads already admitted to the server queue can be assigned;
  the other three leads are not assignable from this screen.
- Reassignment is offered only for `available`, `assigned` and
  `waiting_callback`; a `closed` item can only be reopened.
- An `in_progress` item is intentionally shown as `Active call locked`.
  There is no supervisor `skip current and claim next` operation, nor a
  distinct assistance/takeover flow for an operator who needs help during a
  live conversation.
- A normal `release` operation exists for `assigned`, `awaiting_outcome` and
  `paused`, but the UI does not combine it with an immediate next-lead claim
  or a visible operator refresh.

This is a product/workflow gap, not evidence of an RLS failure. The current
locks protect call outcome integrity, but they leave supervisors without a
safe operational path for queue recovery.

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
- supported admin assignment into the Operator session;
- server call-start action and its audio-failure recovery path.

Not verified in this run:

- active call, timer, mute/hold and hangup browser behavior;
- audio-capable call start in the current browser environment;
- outcome, callback or order completion in the browser;
- post-call next-lead routing after a real completion;
- reload persistence and read-only SQL read-back;
- negative role/workspace or direct RLS denial.

## Result and blocker

The code-level contract has a truthful audio/provider failure path and a
server-authoritative completion path. The authenticated browser boundary and
admin assignment work, but the current environment stops at browser audio
initialization. Separately, queue operations do not yet cover admitting all
leads or safely skipping/assisting an active assignment. This document remains
an interim evidence checkpoint, not a pilot-ready claim and not approval to
begin the Floating Call Controller.

Next safe step: define a follow-up slice for (1) lead-to-queue admission and
bulk assignment visibility, and (2) audited supervisor recovery with explicit
rules for pre-call skip versus active-call assistance. After that, rerun the
browser matrix in an audio-capable environment. Do not seed a fixture or
bypass RLS for this evidence run.
