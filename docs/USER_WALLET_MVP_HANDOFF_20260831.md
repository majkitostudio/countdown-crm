# User Wallet MVP — implementation handoff

## Scope

- Workspace-scoped wallet settings for `CZK`, `EUR` and `PLN`.
- Immutable signed wallet ledger. The balance is derived from transactions.
- Delivered-order bonus using versioned minimum-price thresholds.
- Monthly commission settlement for one operator and one completed month.
- Audited manual positive/negative adjustments by Team Leader or Administrator.
- Operator self-view and manager workspace view at `/wallet`.
- Service-role-only fulfillment boundary for `delivered` and `returned`.

## Business rules implemented

- A bonus is not posted when an order is created.
- A bonus is posted only on a server-authoritative `delivered` event.
- The highest configured threshold at or below the delivered order total is used.
- Starter CZK thresholds are 1,800 → 50, 2,800 → 100, 3,500 → 190,
  4,100 → 370 and 5,700 → 510.
- Monthly commission is a percentage of the operator's delivered order total
  for a completed month and is posted as one immutable monthly transaction.
- A returned order reverses its posted order bonus. If a monthly commission was
  already finalized, the returned order's commission share is reversed too.
- Transaction source event ids are unique and prevent duplicate posting.
- Rule and rate changes do not rewrite posted transaction snapshots.

## Explicit boundary and remaining integration

The current repository has no fulfillment provider or webhook consumer. The
database therefore exposes `public.record_order_fulfillment_event(...)` only to
`service_role`; authenticated users cannot set `delivered` or `returned`, and a
direct delivery-state update is rejected. A future fulfillment integration must
call that RPC with the provider event id and timestamp.

Monthly settlement is similarly exposed only to `service_role` through
`public.finalize_wallet_monthly_commission(...)`. A scheduler or settlement job
must call it after the month closes. No bank payout or money transfer is part of
this slice.

## Non-goals

- Bank or payment-provider payout.
- Historical backfill of old orders.
- Leaderboards, notifications or broader redesign.
- Live Supabase migration application or authenticated persistence/RLS smoke in
  this branch.

## Acceptance criteria

1. Every workspace member can read their own wallet settings and transactions.
2. Operators cannot read another member's transactions or mutate ledger rows.
3. Team Leaders and Administrators can view workspace transactions and create
   an audited adjustment with a mandatory reason.
4. Direct or authenticated attempts to set `delivered`/`returned` fail.
5. The service-role fulfillment boundary is idempotent by event id and posts at
   most one order bonus per order.
6. A returned delivered order creates a negative reversal when a bonus exists.
7. Monthly commission is calculated from delivered totals for the requested
   operator/month and cannot be finalized twice.
8. The wallet UI does not display an unverified live balance; it derives balance
   from the ledger query.

## Verification plan

- Static contract tests for migration grants, RLS, trigger guards, source
  idempotency and UI/DAL role boundaries.
- `npm test`.
- `npm run check`.
- `git diff --check` and explicit diff/status review before commit and push.
- Separate future evidence required: live migration provenance, authenticated
  Operator/Team Leader/Admin RLS smoke, fulfillment event persistence, duplicate
  event replay and return reversal in the actual Supabase project.
