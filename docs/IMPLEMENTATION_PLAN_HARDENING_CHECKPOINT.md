# Implementation plan — pilot hardening checkpoint

**Status:** implemented
**Date:** 2026-08-10
**Scope:** authorization negative paths, explicit mock boundaries, and status documentation

## Objective

Close the remaining high-risk gaps identified during the Supabase stabilization
without adding product functionality or starting the Operator Console redesign.
The result should make the current pilot boundary honest and demonstrate that
workspace isolation fails closed for invalid references.

## Scope

1. Add a safe negative verification for invalid and foreign-workspace parent
   references in the supported order/data access path.
2. Review the remaining mock-only surfaces and make their status explicit in
   the UI/documentation, without pretending they are production integrations.
3. Verify the runtime workflow evaluator does not silently use demo rules in
   the production database path.
4. Update `PRODUCT_STATUS.md` and the database checklist with the evidence from
   this checkpoint.
5. If the current Supabase plan exposes the setting, enable leaked-password
   protection; otherwise record it as an external project-setting blocker and
   do not invent a migration workaround.

## Non-goals

- no new CRM feature;
- no Operator Console redesign;
- no telephony or AI integration;
- no broad RLS policy/index refactor;
- no deletion of existing pilot/test records;
- no remote push or pull request.

## Verification strategy

- use the existing authenticated pilot workspace;
- test an invalid parent ID and a parent from another workspace through the
  supported application/DAL boundary;
- verify the operation fails with a visible error and creates no business row;
- inspect the production workflow runtime path for demo-rule fallback;
- run a focused browser smoke test for the affected path;
- run `npm run typecheck`, `npm run build`, and `git diff --check`;
- document any Supabase Dashboard-only setting that cannot be safely changed
  through the repository.

## Acceptance criteria

1. Invalid and foreign-workspace references are rejected fail-closed.
2. No rejected operation leaves an order or related business row behind.
3. Production mode has no silent demo workflow-rule fallback.
4. Remaining mock-only screens are clearly marked as demo/incomplete or are
   removed from the claimed pilot-ready scope.
5. Documentation distinguishes verified facts from unresolved settings.
6. The implementation is contained in one small, reversible commit with no
   unrelated feature work.

## Commit boundary

If approved and all gates pass, use one focused commit, for example:

```text
fix: close pilot authorization and mock-boundary gaps
```

If leaked-password protection requires a Dashboard-only action, keep that
external setting separate from the code commit and report the exact remaining
manual step.

## Implementation result

The application-side hardening was implemented and verified on 2026-08-10:

- order DAL inputs now require both lead and product IDs;
- active workflow rules are loaded from Supabase into the runtime evaluator;
- workflow rules are no longer restored from localStorage;
- invalid parent IDs were rejected by the live database FK test;
- typecheck and production build passed.

The authenticated runtime workflow smoke remains open because the existing
browser session was intentionally logged out before this checkpoint. The
unauthenticated redirect was rechecked; a fresh login is still required before
claiming the full Operator Console event-to-workflow path as browser-verified.

Remaining items are intentionally outside this implementation slice: leaked
password protection, duplicate policy cleanup, and the remaining mock-only
surfaces.
