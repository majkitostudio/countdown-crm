# Operator Client Profile and Verified Address Verification

Date: 12. 9. 2026

## Scope and evidence boundary

This report covers the implementation currently on `main`:

- `a165a69` — verified delivery-address data model;
- `a402129` — address capture in manual and post-call order flows;
- `e4b7f5a` — read-only Client Profile, script focus composition, notes placement,
  and the related Call Logs and readiness corrections.

The evidence distinguishes executable contracts and local database checks from
the authenticated browser flow. No demo authentication, synthetic customer,
lead claim, order, callback, or write was used for this report.

## Automated verification

| Check | Result |
| --- | --- |
| `npm test` | PASS — 120 test files, 545 tests |
| `npm run check` | PASS — lint, TypeScript, production build; 38 application routes |
| `npx supabase test db` | PASS — 11 SQL files, 188 tests |
| `git diff --check` | PASS |

The database suite includes `delivery_address_snapshot_test.sql`, which proves
that legacy `NULL` snapshots remain valid, invalid snapshots are rejected, and
the address snapshot contract is enforced. Application tests cover validated
forwarding from both order flows, delivered-only address selection, the
assignment-scoped note guard, the safe new-tab profile action, and the Focus
layout contract.

## Authenticated browser verification

Local server: `http://localhost:3000`.

- An existing local Operator account signed in through `/login` and reached
  `/workspace` without enabling demo authentication.
- Reloading `/workspace` retained the truthful empty state: `Waiting for
  assignment` and `No scheduled callbacks`.
- Browser console: 0 errors and 0 warnings.
- No persistence-changing UI action was triggered.

The account had no active assignment and no scheduled callback. Consequently,
the following scenarios could not be verified in the browser without creating
or claiming data, and remain **blocked**, not passed:

1. assigned-customer header and safe new-tab Client Profile;
2. script expand/collapse with a live customer context;
3. append-only note persistence and reload;
4. manual and post-call order address capture, followed by a delivered-order
   read-back; and
5. rejection of a real foreign assignment.

The application deliberately offers no public endpoint for discovering a
foreign lead just for this test. A direct read attempt with an application
secret was rejected by the Supabase boundary; no fallback, privilege change, or
test backdoor was introduced.

## Status and next required evidence

P1.6 is implemented and its automated/local database contracts pass, but it is
not yet fully browser-evidenced. It therefore remains open. Before moving to
the P1.7 three-role full-shift smoke, provide an already assigned, disposable
operator scenario or explicitly authorize a controlled fixture and cleanup
procedure. That browser run must record reload persistence, read-back, and the
foreign-assignment denial without exposing credentials or customer data.
