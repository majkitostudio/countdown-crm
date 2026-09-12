# Customer Activity Read-Model Integration Design

## Goal

Bring the useful parts of the historical customer-activity PR into the current application: a single, workspace-scoped, deterministic customer timeline that can page through calls, orders, and lead notes without losing the timeline sources that current `main` already supports.

## User Outcome

An authorized user opening a customer detail sees one chronologically ordered history of calls, orders, and notes. Existing SMS and status-change types/rendering remain intact, but current main has no producer for these events; this integration does not invent one. Existing filters remain unchanged. The user can load older activity without duplicate events.

## Scope

- Preserve the current timeline UI and its `call`, `order`, `sms_paylink`, `note`, and `status_change` event types.
- Add the historical PR's normalized customer-activity event model, global sorting, opaque cursor, duplicate prevention, and bounded page size for calls, orders, and lead notes.
- Preserve status-change and SMS/pay-link types and rendering for future sources.
- Keep current workspace and lead-scope authorization: every customer activity read resolves the authenticated workspace and checks access to the requested lead before querying activity rows.
- Reuse existing tables and policies. No migration, RLS-policy change, fixture write, or production database action is in scope.

## Non-Goals

- Do not redesign the customer detail drawer or replace existing timeline filters.
- Do not broaden operator access to leads that are not assigned to them.
- Do not add cross-workspace aggregation, export, search, analytics, or new event-producing workflows.
- Do not remove existing SMS/pay-link or status-change timeline events.

## Architecture

`src/lib/customerActivity.ts` owns the normalized event types, deterministic order, cursor validation, deduplication, and paging helpers. The DAL remains server-only and becomes the only layer that reads calls, orders, and lead notes for the read model. It filters each source by both `workspace_id` and `lead_id` only after obtaining the authenticated workspace context and scoped lead.

`listLeadActivityPageAction` exposes the safe page result to the client. Timeline/domain adapters preserve the existing WorkspaceActivity shape used by other components. The existing timeline component keeps its current filters and gains pagination controls. Compatibility consumers can still request the whole timeline. Database sources are read in ordered batches to avoid silent truncation at the Data API row cap. No locally derived SMS/pay-link or status-change producer was found in current main.

## Data and Error Handling

- A page defaults to 50 items and accepts at most 100 items.
- The cursor encodes only the final item's timestamp and stable event ID. Invalid cursors become a validation error; they are never silently treated as the first page.
- Each emitted event uses a source-prefixed stable ID (`call:`, `order:`, or `lead_note:`). Combining sources removes duplicate IDs before sorting.
- Database read failures remain `DataAccessError("DATABASE")`; authorization and validation failures remain fatal rather than becoming an empty timeline.
- Empty activity is a valid empty result, not an error.

## Authorization Contract

The server reader calls `requireWorkspaceContext` and `getScopedLeadForWorkspace` before activity queries. Every calls, orders, and lead-notes query includes both the current workspace ID and requested lead ID. The client receives only page data returned by that server boundary.

## Verification

- Unit-test deterministic global sort, opaque cursor continuation, duplicate removal, page limits, and invalid cursor rejection.
- Exercise the server reader with controlled Supabase query doubles to prove workspace and lead filters are present for every source.
- Preserve the existing All, Calls, Orders, SMS, and Notes filter controls and status-change rendering.
- Respect the user's request to skip further test execution; use typecheck, lint, production build, and independent review before integration. Record remaining verification limitations explicitly.
