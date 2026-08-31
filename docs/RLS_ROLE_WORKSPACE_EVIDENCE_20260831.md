# RLS role/workspace evidence — 31. 8. 2026

## Scope

This slice adds a rollback-scoped pgTAP runtime test for the policy set from
`20260830205207_rls_policy_performance_hardening.sql`. It covers the intended
manager, workspace-member, user-owner, anonymous-grant, and cross-workspace
boundaries without changing the linked database.

The test uses three local Auth identities, two local workspaces, memberships,
and representative parent/child rows. All fixtures are created inside one
transaction and removed by `ROLLBACK`; they are not sandbox or production
evidence.

## Result

Commands run from the repository root:

```text
npx supabase test db --local supabase/tests/database/rls_role_workspace_test.sql
All tests successful. Files=1, Tests=46

npx supabase test db --local supabase/tests/database/rls_policy_performance_test.sql supabase/tests/database/rls_role_workspace_test.sql
All tests successful. Files=2, Tests=58
```

The PR #61 policy migration and the grant correction were applied only to the
running local database for this check. No migration history or linked schema
was changed.

## Covered boundaries

- `anon` has no table grant for the six target tables.
- Administrator can CRUD products, objections, and workflows in the own
  workspace, while cross-workspace rows are invisible and immutable.
- Operator can read products/workflows and can CRUD record entities/values in
  the own workspace, but cannot mutate manager-owned data or cross-workspace
  parent/child rows.
- `user_gamification` is reachable through the authenticated grant and remains
  owner-only for read/write operations.
- Objections cannot attach to a product from another workspace.

## Discovered correction

The existing grant sweep revoked `user_gamification` access but did not grant
the intended authenticated operations back. The focused migration
`20260831060401_grant_user_gamification_authenticated.sql` restores
`SELECT, INSERT, UPDATE, DELETE` for `authenticated`; the user-owner RLS
policies remain the row boundary.

## Remaining evidence gap

The linked sandbox still does not contain PR #61 migration
`20260830205207`, and its current inventory has only one workspace. Therefore
this document proves local rollback-scoped RLS behavior, not live sandbox
cross-workspace denial, browser authorization, or migration application.
Those require the separately approved sandbox provisioning/application step.
