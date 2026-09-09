# Customer activity integration of historical PR #75

Integrated the read model from #75 into current main without replacing newer call-review fields or changing the WorkspaceActivity interface used by RecentContext and LeadDetailDrawer.

- Normalized calls, orders, and lead notes share deterministic sorting, stable source-prefixed IDs, deduplication and cursor pages.
- Every entry point requires authenticated workspace context and scoped lead access before reading activity. Every activity query filters workspace and lead.
- Source rows use ordered batches instead of silently stopping at the Data API row cap. Compatibility callers fetch the full history once, not once per page.
- Full note bodies and order source-note metadata remain available to existing consumers.
- Customer timeline can load more; keyed customer state and request generations prevent stale responses from replacing another customer's state.
- Existing SMS/pay-link and status-change types/rendering remain. Current main has no producer for those events; no such source is claimed or added.
- No schema, policy, fixture, or production database write is part of this integration.

## Verification scope

Typecheck, lint, production build and independent code review are used before integration. Further test execution is skipped at the user's request. No authenticated live database/UI verification is claimed for this revision.

## Known limitation

Cursor slicing currently happens after loading the customer's source events, as in historical #75. Thus Load More bounds the returned UI page, not total database work. A database-side keyset read model is a future optimization; the compatibility adapter avoids multiplying those reads by the number of pages.
