# Workspace Readiness verification

Date: 2026-09-06

## Result

Admin-only `Workspace Readiness` is implemented at `/readiness`. The read model
returns an independent status for each operational check:

- Calendar callbacks and reminders
- Wallet sections
- Lead queue
- Published product scripts
- Local SIP configuration
- Telnyx adapter and external number verification
- Migration history evidence
- RLS and role-boundary evidence
- Workflow rules and trigger availability
- Recent high/critical audit events

The overall status is `Blocked` when at least one check is blocked,
`Needs attention` when no check is blocked but one or more checks need review,
and `Ready` only when every check has positive evidence.

## Truthful blockers

The application does not shell out to run migrations during a request. Without
recorded deployment evidence, migration history remains `Needs attention`.
The same rule applies to the RLS/role-boundary matrix. The optional evidence
variables are documented in `.env.example`; they must only be set after the
corresponding linked verification has actually happened.

Telnyx remains `Blocked` while the adapter is disabled or the assigned number
has not passed external verification. No Telnyx secret or provider response is
returned to the browser.

## Failure isolation

Readiness probes run independently. A wallet failure does not hide available
Calendar, queue or telephony information. An empty queue and empty-but-
successful wallet sections are distinct from an unavailable source.

## Verification evidence

- Focused readiness and navigation contracts: 18/18 tests passed.
- Full application suite: 73 test files, 272 tests passed.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed; `/readiness` is server-rendered dynamically.
- Browser smoke: operator session does not show `/readiness` in navigation and
  direct `/readiness` access shows an administrator-only unavailable state with
  no readiness data.
- No database migration was added or changed in this slice.

The administrator happy-path browser check requires an authenticated
administrator session; the server-side administrator boundary and the full
read model are covered by the automated tests.
