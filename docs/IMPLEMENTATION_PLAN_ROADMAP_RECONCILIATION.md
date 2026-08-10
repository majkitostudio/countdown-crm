# Implementation plan — roadmap reconciliation and stabilization handoff

**Status:** implemented
**Date:** 2026-08-10
**Scope:** documentation and a small, reversible stabilization checkpoint only

## Objective

Bring the project roadmap and product-status documentation into agreement with
the work that is actually present in Git and verified against the live pilot
workspace. The recent Supabase/auth work was intentionally delivered as one
coherent stabilization change even though it covers several originally planned
commit stages. The documentation should record that honestly instead of
leaving those stages looking unfinished.

## Scope

1. Reconcile the roadmap with the current Git history.
2. Mark the completed stages that were delivered together by
   `3a41273 refactor: harden Supabase-backed CRM workflows`.
3. Keep the cleanup commits (`85134de`, `e547349`) identified as repository
   hygiene, not product roadmap stages.
4. Mark the database/auth stabilization segment as complete for the current
   one-company pilot, while preserving the remaining hardening items.
5. Record the exact open items that must be completed before the next product
   feature or Operator Console redesign.
6. Update the relevant checklist and checkpoint language so it no longer says
   that already-verified work is pending.

## Non-goals

- no new product functionality;
- no schema redesign or new Supabase migration;
- no changes to authentication behavior;
- no broad cleanup of all existing lint errors;
- no Operator Console redesign;
- no remote push or pull request;
- no deletion of existing test data unless separately requested.

## Proposed documentation changes

### 1. Product status and roadmap

Update `docs/PRODUCT_STATUS.md` to distinguish three states:

- completed roadmap stages;
- completed stages delivered together in the stabilization commit;
- genuinely open stages and follow-up hardening work.

The roadmap will explicitly map the current history as follows:

| Roadmap stages | Current state |
|---|---|
| Commits 1–5 | completed in the existing baseline/auth/workspace history |
| Commits 6–9 | completed for the verified pilot scope as one stabilization slice |
| Commit 10 | partially complete; targeted UX/data-state fixes landed, lint debt remains |
| Commit 11 | next major product stage: Operator Console review/redesign |
| Commits 12–13 | later: telephony/AI boundaries and release readiness |

### 2. Database checklist and checkpoint

Update the database documents to:

- mark verified workflow edit/delete and auth gates as complete;
- retain unresolved security-advisor and negative-authorization tests as
  explicit follow-up items;
- state that the database segment is complete for the current pilot scope;
- avoid implying that all future hardening or all mock-only surfaces are done.

### 3. Commit history documentation

Update `docs/commits.md` and/or `docs/commits_roadmap.md` only where needed to
make the merged stabilization slice discoverable. Existing Git history will
not be rewritten.

## Verification before committing the documentation

- inspect the current Git log and worktree;
- confirm the referenced commit hashes exist;
- confirm the database checkpoint and checklist agree;
- run `git diff --check`;
- do not rerun product code tests unless the documentation edits touch code or
  configuration.

## Acceptance criteria

The plan is complete when:

1. A reader can tell which roadmap stages are complete without reconstructing
   the whole Git history.
2. The merged stages 6–9 are clearly identified as one delivered stabilization
   slice, not falsely shown as four missing commits.
3. The next work is described as a bounded hardening checkpoint, followed by
   the Operator Console product review.
4. No documentation claims that leaked-password protection, all negative RLS
   tests, all mock-only surfaces, or lint cleanup are already complete.
5. The changes are documentation-only and land in one small commit.

## Commit boundary

If this plan is approved, the implementation should produce one documentation
commit, for example:

```text
docs: reconcile roadmap with completed stabilization slice
```

After that commit, the next implementation plan should cover only the bounded
authorization/mock-surface hardening checkpoint. The Operator Console redesign
should remain a separate future commit and should not be mixed into either
documentation reconciliation or database cleanup.

## Implementation result

This documentation-only plan was implemented on 2026-08-10. The roadmap,
product status, database checklist, database checkpoint, and historical commit
indexes now identify the consolidated stabilization slice and its remaining
follow-up work. The changes are ready for one documentation commit.
