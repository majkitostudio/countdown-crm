# Sandbox call outcome RPC fix — 2026-09-01

## Scope

Allow the atomic post-call completion RPC to finish a server-persisted
`awaiting_outcome` assignment as well as an `in_progress` call. No production
database or live business data was changed.

## Root cause

The authenticated Operator browser flow displayed a persisted `awaiting_outcome`
assignment after the call ended. `public.complete_lead_call_with_order_items`
still guarded its lookup with `state = 'in_progress'`, so the outcome action
returned HTTP 500: `Lead assignment is not active for this Operator`.

The lower-level `private.complete_lead_call_impl` already accepts
`awaiting_outcome`; the mismatch was in the order-items wrapper.

## Applied fix

Migration `20260901143000_allow_outcome_completion_after_call_end.sql` updates
the wrapper guard to accept both `in_progress` and `awaiting_outcome`, while
retaining the current authenticated operator, workspace product, atomic call,
order, and order-item checks.

The migration was applied only to Sandbox `lpvypihpxhyjljikfzqo` after
`supabase migration list --linked` showed one exact pending migration and no
local/remote provenance mismatch.

## Evidence

- Before the fix: authenticated Operator click on `Not interested` returned
  HTTP 500; SQL counts remained calls `18`, orders `12`, order_items `6`.
- Live function read-back: the wrapper accepts both states, retains
  `SECURITY INVOKER`, and no longer contains the old single-state guard.
- After the fix: the same authenticated click completed successfully and the
  browser moved from `Awaiting outcome` to `Waiting for assignment`.
- SQL read-back: calls `19`, calls for the test lead `18`, orders `12`,
  order_items `6`; the queue item is `closed`, unassigned, with
  `last_outcome = objection`; a `completed` queue event was recorded.
- `/workspace` reload after completion stayed `Waiting for assignment`; the
  fresh browser console returned zero errors.
- Existing cross-workspace/RLS negative evidence remains a separate gate; this
  patch does not broaden workspace or operator authorization.

## Local gates

- `npm test` — 31 files, 125 tests passed.
- `npm run check` — lint, typecheck, and production build passed.
- `git diff --check` — passed.
- `supabase db lint --local` — no schema errors.
