# Database Stabilization Checkpoint — 2026-08-10

This checkpoint records the current decision point before the next commit.

## Verified against the live pilot workspace

- authenticated workspace membership and workspace-scoped queries;
- lead creation, status update, audit event, and reload persistence;
- product creation and workspace ownership;
- call creation linked to a real lead;
- order creation linked to a real lead and product;
- workflow creation, toggle persistence, and reload persistence;
- built-in Deals schema and custom EAV record persistence;
- truthful empty states and visible database failures in the covered paths.

## Hardening now in place

- missing workspace membership is an authorization error;
- order parents must exist in the active workspace;
- failed lead/product/workflow/custom-record writes are not reported as success;
- operator presence is labelled unavailable until a real integration exists;
- production reads no longer use mock data as their source of truth in the
  covered modules.

## Follow-up hardening after the stabilization commit

- verify invalid parent and foreign-workspace references are rejected;
- verify the persisted workflow snapshot is loaded into the runtime evaluator;
- isolate remaining mock-only monitor, timeline, training, objection and
  dashboard activity surfaces;
- update the older product baseline wording where it still describes live RLS
  migrations as unapplied.

## Commit boundary

The database/stabilization segment is closed by commit `3a41273`. Commits
`85134de` and `e547349` are repository-hygiene follow-ups only. A new product
feature should begin after the documentation reconciliation and any explicitly
selected hardening item have their own bounded commit.

## Latest verification

Workflow edit, reload, toggle, reload, and delete have now passed in a fresh
authenticated browser session. SQL confirmed that the deleted workflow row is
absent from the live database.

Foreign-key constraints exist for calls, orders, custom records, record values,
and workflow executions. The application additionally validates order parents
against the active workspace before insertion.

The authenticated runtime smoke also passed: a Supabase-backed `on_call_ended`
rule executed from Operator Console, the UI reported `1 / 1` successful
execution, and SQL verified a `success` row with the expected rule, lead,
payload, and `notify_manager` action. The temporary smoke rule was then
deactivated so it cannot affect later calls.

Supabase advisors currently report one security warning: leaked-password
protection is disabled. Performance notices are informational unused-index
reports plus duplicate permissive-policy warnings; they should be handled in a
separate policy/performance migration, not hidden by changing the advisor
configuration.

## Latest hardening after this checkpoint — 2026-08-17

The stabilization work continued in small, independently reversible slices:

- `cc19eb4`: Product Catalog moved behind the server DAL and role boundary.
- `adfcb10`: Audit Log moved behind the server DAL with server-derived
  workspace and operator attribution.
- `034b169`: Workflows moved behind the server DAL and Server Actions; the
  browser service and `localStorage` execution history were removed.
- Schema/custom-object work in the current slice moves custom objects,
  attribute definitions, record entities, and record values behind the server
  DAL and Server Actions. Built-in schemas remain available while workspace
  attributes are merged from the database.

The latest gates passed `npm run check` and `git diff --check`. An authenticated
browser session verified `/objects/deals` loading the persisted deal and
`/settings` loading workspace schemas. A temporary custom object also survived
create → reload and was checked directly in SQL; its cleanup is intentionally
kept separate until the destructive confirmation dialog is accepted.

### Historical product cleanup blocker

`Playwright Test Product` is still present because it is referenced by six
completed orders. The live foreign key `orders_product_id_fkey` uses
`ON DELETE RESTRICT`. No historical order was deleted during stabilization.
The remaining product decision is archive-from-catalog versus explicit,
separately approved deletion of those six orders; archive is the recommended
production-safe option.
