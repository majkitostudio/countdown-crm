<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Countdown CRM: delivery autonomy and Git discipline

The user relies on Codex to decide the normal delivery mechanics. Do not wait
for the user to remember to ask for a commit, push, or pull request.

### Required task and validation loop

- Treat every implementation, code/config/schema change, dependency update, or
  project maintenance change as a complete task loop: inspect the current
  checkout, make the bounded change, run the applicable full validation, and
  finish with an explicit Git state. Do not wait for the user to ask for tests.
- Every implementation task must have its own Codex task/chat and a clearly
  named feature/fix/docs branch. If the work is starting on `main` or on an
  unrelated branch, create or switch to the task branch before editing. Keep
  one coherent slice per branch and do not mix unrelated work.
- Before and after work, keep Git current safely: fetch remote refs before
  deciding the base or delivery target, inspect divergence, and integrate newer
  base changes only with a clean worktree and an unambiguous target. Never use
  reset, force-push, or blind pull to hide divergence or discard work.
- After the final edit, run every relevant repository test and quality gate.
  For this repository the default complete gate is `npm test`, `npm run check`,
  and `git diff --check`; `npm run check` covers lint, typecheck, and the
  production build. If another test script, migration check, browser smoke,
  persistence check, authorization check, or RLS check is relevant to the
  changed surface, run it as well. Do not call a slice verified when a required
  gate failed, was skipped, or could not run; distinguish pre-existing failures
  from failures introduced by the change.
- Build/test success is not proof of authenticated browser behavior,
  persistence after reload, workspace authorization, or Supabase RLS. Report
  those as separate evidence gates and verify them when the slice touches them.

### Required delivery behavior

- Before implementation, report the current folder, branch, base commit, scope,
  non-goals, acceptance criteria, and verification plan.
- For each coherent, verified slice, create a focused commit when the change is
  ready. A commit is a deliberate checkpoint, not something to do only when
  the user remembers to ask.
- Push a committed slice when the branch and remote are clear and the change is
  ready to share. Do not push unrelated, unverified, or accidentally staged
  work.
- Decide the normal delivery action autonomously after verification. Use a
  focused push for a small, low-risk slice; use a draft pull request for broad,
  risky, review-sensitive, or unresolved work. Merge only when the target,
  checks, review boundary, and conflict state are all unambiguous and the
  repository policy permits it. If a required tool or permission is missing,
  complete the safe local checkpoint and state the exact remaining action.
- If the work is incomplete, leave it on a clearly named branch with a commit
  or an explicit handoff describing what remains. Do not leave completed work
  silently uncommitted.
- After committing, pushing, opening, updating, merging, or closing a PR,
  report exactly what happened, the reason for the choice, and the remaining
  evidence or risk. The user should not need Git knowledge to know the state.

### Safety gates before external delivery

- Recheck `git status`, the active branch/worktree, the diff, and the intended
  file list immediately before staging or pushing.
- Stage paths explicitly. Never use `git add .`, `git add -A`, or equivalent
  bulk staging in this repository; preserve unrelated and generated artifacts.
- Do not merge or delete a branch merely because it is old or not an ancestor
  of `main`. Compare its unique commits and files first, check related PRs, and
  preserve important work with an explicit archive tag or a new branch before
  deletion.
- Treat build, deploy, and preview success as separate from authenticated
  browser, persistence, authorization, and RLS proof.
- If the branch, worktree, intended scope, or external target is ambiguous,
  stop the delivery action, explain the ambiguity, and resolve it before
  pushing, merging, or deleting anything.

### End-of-task state

Every implementation task must end in one of these explicit states:

1. verified, committed, and pushed (with PR state if applicable),
2. safely committed on a named branch with the exact next step stated, or
3. blocked, with the concrete missing authority, evidence, or external change
   identified.

### Required handoff

- End every implementation task with a short plain-language report containing
  the changed slice, validation results, current branch/commit/push/PR/merge
  state, and any remaining evidence gap. Never imply that code existence alone
  proves the live workflow.
