# Role-aware home — verification report

**Date:** 2026-09-06  
**Scope:** server-authoritative home routing for Operator, Team Leader and Administrator

## Implemented behavior

- `/` resolves the authenticated workspace membership on the server.
- Operator is sent to `/workspace`.
- Team Leader is sent to `/exceptions`.
- Administrator is sent to `/readiness`.
- Successful login and the brand/logo home link enter through `/` instead of hard-coding an Operator destination.
- The existing workspace Dashboard moved to `/dashboard` and remains visible only to Team Leaders and Administrators.
- A direct Operator request to `/dashboard` returns the Operator to `/workspace` without exposing dashboard content or showing a server-error page.

## Automated evidence

- Focused role routing, login, proxy, navigation and dashboard-boundary tests passed: 19/19.
- Full Vitest suite passed: 77 files, 281 tests.
- ESLint passed.
- TypeScript `--noEmit` passed.
- Next.js production build passed and emitted dynamic `/` and `/dashboard` routes.

## Browser evidence

The authenticated local browser session was an Operator:

- opening `http://localhost:3004/` ended at `/workspace`,
- the page rendered meaningful Operator Console content,
- no `/dashboard` link was present in Operator navigation,
- opening `/dashboard` directly returned to `/workspace`,
- no Next.js error overlay or fresh console error remained after the fix.

The Team Leader and Administrator destinations are covered by automated server-routing tests. A manual browser pass for those two roles was not performed in this slice because the available browser session was authenticated as an Operator.

## Data and deployment impact

- No Supabase schema or migration changed.
- No workspace records were created, edited or deleted.
- Telnyx state remains unchanged and blocked by the existing external number-verification dependency.
