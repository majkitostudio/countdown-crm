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

The fresh Playwright session had no authenticated cookies. Opening
`/workspace` therefore redirected to `/login`:

- URL: `http://localhost:3000/login`
- Login snapshot: `output/playwright/.playwright-cli/page-2026-09-02T03-39-32-089Z.yml`
- Login screenshot: `output/playwright/.playwright-cli/page-2026-09-02T03-40-02-975Z.png`
- Console: 0 errors, 1 accessibility warning about the password
  `autocomplete` attribute, and normal React/Next development messages.

The login page itself rendered the expected Supabase Auth boundary. No
credentials were entered because the task forbids demo auth and no existing
authorized browser state was available in this Playwright session.

## Verification status

Passed locally on the current code baseline:

- targeted call/workflow tests: 5 files, 18 tests;
- full Vitest suite: 29 files, 121 tests;
- ESLint;
- TypeScript check;
- production build.

Not verified in this run:

- authenticated `/workspace` load and server-provided assignment;
- call start with the real authorized session;
- active call, timer, mute/hold and hangup browser behavior;
- outcome, callback or order completion in the browser;
- post-call next-lead routing after a real completion;
- reload persistence and read-only SQL read-back;
- negative role/workspace or direct RLS denial.

## Result and blocker

The code-level contract has a truthful audio/provider failure path and a
server-authoritative completion path. The required authenticated workflow
evidence cannot be completed without an authorized browser session. This
document is therefore an interim evidence checkpoint, not a pilot-ready claim
and not approval to begin the Floating Call Controller.

Next safe step: rerun the same browser matrix in an existing authorized
Operator session, without demo auth or new test identities.
