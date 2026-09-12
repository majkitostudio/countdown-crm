# P1 Team Queue Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep authorized Team Queue data usable when operator or administrator-member enrichment fails, and remove brittle per-member profile hydration.

**Architecture:** Authenticate and authorize before loading page sections. A server-only loader settles queue, operator, and administrator-member sources independently, downgrades only `DATABASE`, and returns explicit source states. Membership lists load memberships once and profiles once, then merge them without dropping a valid membership when its profile is absent.

**Tech Stack:** Next.js 16 Server Components, React 19, TypeScript, Supabase DAL, Vitest

**Spec:** `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md`

## Global Constraints

- `/team` remains authorized only for `team_leader` and `administrator`.
- `administrator` alone may load or mutate workspace membership management.
- Only `DataAccessError("DATABASE")` becomes source unavailability; every other error is rethrown.
- An unavailable operator list never appears as a verified empty list and disables reassignment.
- An unavailable queue never appears as a verified empty queue.
- Missing profile data does not erase an authoritative membership or role.
- No synthetic email, avatar, assignment, or role is created.
- Navigation labels are out of scope for this plan.

---

### Task 1: Define the Team page source-state loader

**Files:**
- Create: `src/lib/dal/teamPage.ts`
- Create: `tests/team-page-loader.test.ts`

**Interfaces:**
- Consumes: an already-authorized workspace context, `listQueueItemsForWorkspace`, `listWorkspaceOperators`, and `listWorkspaceMembers`
- Produces: `loadTeamPageData(context): Promise<TeamPageData>` with explicit `queue`, `operators`, and admin-only `members` source states

- [ ] **Step 1: Write failing table-driven loader tests**

Cover literal outcomes:

```ts
queue DATABASE + operators ready       -> queue unavailable, operators ready
queue ready + operators DATABASE       -> queue ready, operators unavailable
admin members DATABASE                 -> queue/operators preserved, members unavailable
team_leader                            -> members source not requested
FORBIDDEN / VALIDATION / unknown error -> original rejection preserved
```

Assert the operator and member loaders are never called before an authorized context is supplied.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/team-page-loader.test.ts`

Expected: FAIL because `loadTeamPageData` does not exist.

- [ ] **Step 3: Implement the minimal server-only loader**

Use:

```ts
type TeamSource<T> =
  | { state: "available"; data: T }
  | { state: "unavailable"; message: string };

interface TeamPageData {
  queue: TeamSource<QueueItemDTO[]>;
  operators: TeamSource<WorkspaceMemberDTO[]>;
  members: TeamSource<WorkspaceMemberDTO[]> | null;
}
```

Run queue/operators and, for administrators, members via `Promise.allSettled`. Convert only `DATABASE`; rethrow other `DataAccessError` values and unknown errors.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- tests/team-page-loader.test.ts`

Commit: `git commit -m "feat: isolate team page data sources"`

### Task 2: Render independent Team sections

**Files:**
- Modify: `src/app/team/page.tsx`
- Modify: `src/components/team/TeamQueuePanel.tsx`
- Create: `src/components/team/TeamPageContent.tsx`
- Create: `tests/team-page-partial-state.test.ts`

**Interfaces:**
- Consumes: `TeamPageData` from Task 1
- Produces: real server-renderable markup for available, partial, empty, and unavailable section combinations

- [ ] **Step 1: Write failing real-render tests**

Render `TeamPageContent` with literal states and assert:

- available queue plus unavailable operators keeps queue rows and shows an operator-source warning,
- reassignment controls are disabled when operators are unavailable,
- unavailable queue shows no verified `0 queue items` claim,
- unavailable admin members does not hide the queue,
- verified available empty queue renders the existing empty state,
- Team Leader markup contains no membership management.

- [ ] **Step 2: Run the render test and verify RED**

Run: `npm test -- tests/team-page-partial-state.test.ts`

Expected: FAIL because the pure presentation boundary and source-state props do not exist.

- [ ] **Step 3: Implement the minimal page boundary**

`TeamPage` calls `requireWorkspaceContext` first and rejects unauthorized roles before `loadTeamPageData`. It passes available data only from `state === "available"`. `TeamQueuePanel` receives an explicit operator-source state; it never infers availability from `operators.length`. Queue and membership unavailability render independent status panels.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/team-page-loader.test.ts tests/team-page-partial-state.test.ts`

Commit: `git commit -m "fix: keep team queue available through partial failures"`

### Task 3: Batch membership profile hydration

**Files:**
- Modify: `src/lib/dal/memberships.ts`
- Create: `tests/memberships-list.test.ts`

**Interfaces:**
- Consumes: authoritative `workspace_members` rows and one batched `profiles` query
- Produces: `mergeMembershipProfiles(memberships, profiles): WorkspaceMemberDTO[]`; list functions perform two queries regardless of member count

- [ ] **Step 1: Write failing pure merge and DAL query tests**

Assert:

- a membership with a profile retains the verified name/email/avatar,
- a membership without a profile remains present with `Unknown operator`, empty email, and null avatar,
- roles and workspace IDs always come from membership rows,
- one list call performs one membership query and at most one profile query,
- a membership query failure throws `DATABASE`,
- a profile query failure throws `DATABASE`,
- an empty membership list performs no profile query.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/memberships-list.test.ts`

Expected: FAIL because list functions still call `loadMember` once per row and no pure merge function exists.

- [ ] **Step 3: Implement the minimal batch loader**

Keep `loadMember` for mutation read-back. For list functions, query memberships once, return immediately when empty, query profiles with `.in("id", userIds)` once, index profiles by ID, and call the pure merge function. Do not silently swallow a failed whole-profile query.

- [ ] **Step 4: Run membership and dependent wallet tests**

Run: `npm test -- tests/memberships-list.test.ts tests/wallet-runtime.test.ts`

Expected: all tests pass and wallet behavior remains unchanged.

- [ ] **Step 5: Commit the DAL improvement**

Commit: `git commit -m "refactor: batch workspace member profiles"`

### Task 4: Verify the complete Team slice

**Files:**
- Verify: all Task 1-3 files

**Interfaces:**
- Consumes: completed loader, presentation, and batch hydration
- Produces: a reviewed stacked branch ready for a PR against `codex/p1-next-best-action-resilience`

- [ ] **Step 1: Run focused verification**

Run: `npm test -- tests/team-page-loader.test.ts tests/team-page-partial-state.test.ts tests/memberships-list.test.ts tests/wallet-runtime.test.ts`

- [ ] **Step 2: Run full verification**

Run:

```text
npm test
npm run check
git diff --check
```

- [ ] **Step 3: Request independent review**

Reject completion while any Critical or Important finding remains. Confirm that no navigation file, membership mutation authorization, or unrelated queue workflow changed.

- [ ] **Step 4: Push a stacked branch**

Push HEAD as `codex/p1-team-queue-resilience` and open a PR with base `codex/p1-next-best-action-resilience`. Do not merge it automatically.

