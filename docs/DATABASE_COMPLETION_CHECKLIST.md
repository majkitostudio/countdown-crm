# Countdown CRM — Database Completion Checklist

**Updated:** 2026-08-10  
**Scope:** clean Supabase project, one-company MVP, workspace-ready data model  
**Status:** complete for the verified one-company pilot scope; follow-up hardening remains

This document is the working checklist for finishing the database-backed CRM
segment. It is intentionally separate from the product roadmap: a screen is
not considered complete merely because it renders or because a build passes.

## Current baseline

- Supabase project is the existing project with mock/demo rows removed.
- The authenticated pilot user exists in Supabase Auth and has an admin
  membership in the `main` workspace.
- Workspace-aware RLS migrations are applied remotely through migration
  `20260810071051` through `20260810071346`.
- Migration `20260810_0008_grant_authenticated_table_access.sql` adds the
  missing PostgreSQL table grants for the `authenticated` API role. RLS remains
  the row-level authorization boundary.
- Security advisor has no workspace/RLS exposure finding. The remaining Auth
  recommendation is to enable leaked-password protection.
- Empty states now come from the database instead of silently falling back to
  mock data in leads, products, calls, orders, analytics, audit, workflows and
  custom records.
- `npm run typecheck` passes.
- `npm run build` passes.
- The verified stabilization work is committed in `3a41273`; the two following
  commits only remove Playwright artifacts from repository history.

## Ordered worklist

### 1. Workspace and authorization boundary — complete

- [x] Resolve membership for the authenticated user, not the first global row.
- [x] Verify `workspace_id` on all workspace-scoped business queries.
- [x] Add PostgreSQL table grants for the `authenticated` role.
- [x] Keep RLS policies as the final row-level boundary.
- [ ] Remove remaining duplicate permissive policies where they do not add a
      distinct operation boundary.
- [ ] Enable Supabase leaked-password protection in project Auth settings.

### 2. Read paths and truthful empty/error states — in progress

- [x] Leads read path uses Supabase and treats an empty result as valid.
- [x] Products read path uses Supabase and treats an empty result as valid.
- [x] Calls read path uses Supabase and treats an empty result as valid.
- [x] Orders read path uses Supabase and treats an empty result as valid.
- [x] Analytics returns zero metrics for an empty workspace.
- [x] Audit log reads from `audit_logs`.
- [x] Workflow rules and executions read from Supabase.
- [x] Custom record entities and values read from Supabase.
- [ ] Remove or isolate remaining mock-only components: monitor, timeline,
      training fixtures, objection fixtures and dashboard activity widgets.
- [ ] Ensure query failures are visible to the user and are never converted
      into fabricated CRM records or metrics.

### 3. CRUD and persistence — next verification target

- [x] Create a lead through the UI and verify the row in Supabase.
- [x] Reload the browser and verify the lead remains visible.
- [x] Update lead status and verify the update is persisted.
- [x] Create a product, verify workspace ownership, and verify it remains after reload.
- [x] Create a call linked to a real lead and verify the relation.
- [x] Create an order linked to a real lead/product and verify both relations.
- [x] Create a workflow, toggle it off, and verify both states survive reload.
- [x] Edit a workflow, reload it, toggle it, reload it again, and delete it;
      verify the deleted row is absent from Supabase.
- [x] Seed the built-in Deals schema, create a custom object record, and verify its four EAV values plus workspace ownership.
- [x] Write a lead-status audit event for an important mutation and verify its workspace.
- [x] Confirm invalid parent IDs and foreign-workspace IDs are rejected.

### 4. Runtime behavior and operator surface

- [x] Load persisted workspace rules into the runtime workflow evaluator.
- [x] Keep the runtime engine free of default demo rules in production mode.
- [x] Run an authenticated Operator Console event-to-workflow smoke after a
      fresh login; verify successful execution in the UI and Supabase.
- [ ] Replace static dashboard KPI/activity widgets with database-derived
      values.
- [ ] Load operator profile from the authenticated profile row.
- [x] Replace fake online/operator presence with a clearly labelled
      `Presence unavailable` state until a real integration exists.
- [ ] Keep `Demo Sandbox` opt-in and visibly separate from `Production DB`.

### 5. End-to-end verification

- [x] Login with real Supabase Auth credentials.
- [x] Confirm redirect to `/workspace` and server session visibility.
- [x] Confirm unauthenticated routes redirect to `/login`.
- [x] Run the CRUD workflow in a fresh Playwright browser context.
- [x] Reload after every supported critical write and verify persistence.
- [x] Verify logout invalidates access to protected routes.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm run lint`; current repository baseline remains 29 errors and
      121 warnings and is tracked separately from the database work.
- [x] Run Supabase security and performance advisors after final migrations.

## Definition of done for this segment

The database segment is complete only when all of the following are true:

1. An authenticated user can use the supported CRM CRUD workflows.
2. Every business row is tied to the active workspace and protected by RLS.
3. A successful UI write survives reload and is still present in Supabase.
4. Empty data is rendered as empty data, never as mock content.
5. Database and authorization failures are visible and actionable.
6. No production path depends on localStorage or in-memory state as its source
   of truth.
7. The critical workflows pass Playwright verification.

## Working rule

Do not mark an item complete from a code inspection alone. Each item that
changes user-visible data behavior needs a database result and, where relevant,
a browser reload/persistence check.

## Stabilization checkpoint — 2026-08-10

The authenticated pilot workspace has passed live browser and SQL checks for
lead, product, call, order, workflow, custom EAV record, audit persistence,
workflow edit/delete, and auth logout/redirect behavior. The database-backed
stabilization segment is complete for the verified one-company pilot scope.

The remaining unchecked items are follow-up hardening or product-surface work:
negative foreign-workspace tests, leaked-password protection, duplicate policy
cleanup, mock-only surfaces, persisted runtime rule evaluation, database-backed
dashboard widgets, and explicit demo-sandbox separation.

## Current follow-up map — 2026-08-17

- [x] Workflow rules and executions use the server DAL/Server Actions and no
      longer use a browser service or local execution-log storage.
- [x] Built-in and custom object schemas are read through the server DAL with
      workspace-scoped attributes; object records and EAV values use server
      reads/writes with visible error states.
- [x] Custom object creation is restricted to manager/admin and deletion is
      restricted to empty non-built-in objects; objects with records are
      rejected rather than cascaded.
- [x] `/objects/deals` and `/settings` were checked in an authenticated browser
      session after the server-boundary changes.
- [ ] Remove or archive `Playwright Test Product` without deleting its six
      completed orders. Current FK protection is working as intended.
- [ ] Replace remaining client schema-engine consumers in the Leads and
      Operator Console dynamic-attribute surfaces with a shared server-loaded
      schema context before claiming the entire schema engine is free of local
      fallback state.
- [ ] Keep leaked-password protection, duplicate RLS policies, mock-only
      monitor/timeline/training surfaces, dashboard activity/KPI hardening and
      demo-sandbox separation as separate follow-up slices.
