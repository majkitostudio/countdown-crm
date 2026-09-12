# P1 Source and Role Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the shared source-availability and role-surface contract that every P1 implementation plan must follow.

**Architecture:** This plan records domain-specific source dependencies and truthful UI outcomes before application code changes. It reuses the repository's existing structured availability patterns, keeps authorization failures fatal, and permits a shared helper only after two consumers demonstrate the same exact type contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase DAL, Vitest

**Spec:** `docs/AKTUALNI_STAV_A_DESATERO.md` P1 and `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

## Global Constraints

- The exact workspace roles are `operator`, `team_leader`, and `administrator`.
- The actual `DataAccessError` codes are `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, and `DATABASE`.
- Only `DATABASE` may be converted to source unavailability by default. Provider failures require an explicit provider adapter. All other `DataAccessError` codes remain request-level failures and are never converted to partial UI.
- `0`, `[]`, and `null` represent verified domain values only; they never stand in for source failure.
- A higher-priority unavailable source prevents lower-priority data from being described as definitively "best" unless the domain contract proves otherwise.
- Navigation visibility is discoverability, not authorization; route, action, and DAL guards remain authoritative.
- No live telephony provider, production credential, or linked environment is changed by this plan.
- Do not introduce a generic availability framework until at least two P1 consumers require the same exact interface.

---

### Task 1: Record the shared failure taxonomy

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md`
- Reference: `src/lib/dal/calendar.ts`
- Reference: `src/lib/dal/wallet.ts`
- Reference: `src/lib/dal/workspaceReadiness.ts`

**Interfaces:**
- Consumes: existing structured calendar, wallet, and readiness availability states
- Produces: the required source-state vocabulary used by every subsequent P1 plan

- [ ] **Step 1: Verify existing structured state names**

Run:

```text
rg -n "SourceState|SectionState|unavailable|Promise\.allSettled" src/lib/dal src/components tests
```

Expected: calendar, wallet, readiness, or related DAL code demonstrates structured operational unavailability without weakening authorization guards.

- [ ] **Step 2: Use this normative vocabulary in every downstream plan**

```ts
type SourceState<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" | "provider" };

type CompositeAvailability = "ready" | "partial" | "unavailable";
```

`empty` is not a source status. It is a verified domain interpretation of `ready` data such as an empty array or zero count. Domain-specific types may add warnings or source metadata, but may not weaken the global constraints.

- [ ] **Step 3: Record the fatal-error boundary in every downstream plan**

Every loader or action must rethrow or return its existing request-level failure for `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, and `CONFLICT`. Only `DATABASE`, or a provider failure explicitly classified by a provider adapter, may become `SourceState.status === "unavailable"`.

- [ ] **Step 4: Review the contract for false-empty behavior**

Run:

```text
rg -n "\|\| 0|\?\? 0|catch.*\[\]|return \[\]" src/app src/components src/lib
```

Expected: findings are classified per domain; this command is an inventory and is not authorization for a repository-wide rewrite.

- [ ] **Step 5: Commit the contract plan**

```text
git add docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md
git commit -m "docs: define P1 source and role contracts"
```

### Task 2: Freeze the domain matrix for partial data

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md`
- Reference: `src/components/dashboard/NextBestActionCard.tsx`
- Reference: `src/components/workspace/RecentContextRow.tsx`
- Reference: `src/app/products/page.tsx`
- Reference: `src/app/team/page.tsx`
- Reference: `src/lib/analytics.ts`

**Interfaces:**
- Consumes: the failure taxonomy from Task 1
- Produces: acceptance rules for the Recent Context, Next Best Action, Products, Team, and Analytics implementation plans

- [ ] **Step 1: Apply the following domain matrix**

| Surface | Primary source | Independent or enrichment source | Required partial behavior |
|---|---|---|---|
| Recent Context | lead activities | calendar callbacks | Preserve either verified source; both operationally unavailable means whole-row unavailable. |
| Next Best Action | priority decision across callbacks and reorder | lead/product metadata enrich reorder | A lower-priority result may be shown as available information but not as definitive "best" while a higher-priority source is unknown. |
| Products | products | objections and order counts | Preserve catalog; never render unavailable counts as zero; disable or explain count-dependent affordances. |
| Team | queue | reassignment operators and admin member panel | Preserve queue; disable reassignment when operators are unavailable; isolate the admin panel. |
| Analytics | orders and calls according to metric | profiles and recent-activity enrichment | Give each section its own state; conversion requires both orders and calls; export must disclose or reject partial data. |

- [ ] **Step 2: Require refresh semantics in each implementation plan**

After a mutation, every affected source is reloaded through the same isolating loader used for initial load. If refresh fails, stale values must not be presented as fresh without an explicit stale/unavailable indicator.

- [ ] **Step 3: Require focused rejection tests**

Each downstream plan must test every independent source rejecting with `DATABASE`, both operational sources rejecting, verified empty data, and at least one fatal non-`DATABASE` error that is not converted to partial data.

- [ ] **Step 4: Review plan boundaries**

Expected boundaries:

```text
Recent Context != Next Best Action
Products != Team
Team != Analytics
Navigation != server authorization
Call Logs copy != telephony dependency changes
```

No downstream plan may combine the separated boundaries merely because they share `Promise.all` or a role helper.

### Task 3: Freeze the role and product-surface matrix

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md`
- Reference: `src/lib/auth/roles.ts`
- Reference: `src/lib/auth/roleHome.ts`
- Reference: `src/components/layout/sidebarNavigation.ts`
- Reference: `src/components/layout/headerNavigation.ts`
- Reference: `src/app/team/page.tsx`
- Reference: `src/app/products/page.tsx`

**Interfaces:**
- Consumes: existing `WorkspaceRole` and server/DAL guards
- Produces: the authoritative intended visibility matrix for navigation and Products UI tests

- [ ] **Step 1: Apply the role-home matrix**

| Role | Home |
|---|---|
| `operator` | `/workspace` |
| `team_leader` | `/exceptions` |
| `administrator` | `/readiness` |

- [ ] **Step 2: Apply the Team and Monitor surface contract**

| Surface | Operator | Team Leader | Administrator |
|---|---|---|---|
| `/team` | hidden and denied | visible as `Team Queue` | visible as `Workspace Members & Queue` |
| `/monitor` | hidden and denied | hidden while runtime data is unavailable | hidden while runtime data is unavailable |

Direct-route expectations must be asserted independently of navigation visibility.

- [ ] **Step 3: Apply the Products role contract**

`operator` receives a read-only catalog and must not see Add, Edit, Delete, Reassign, New Objection, or equivalent management affordances. `team_leader` and `administrator` receive only the management affordances allowed by the existing server and DAL guards.

- [ ] **Step 4: Require a single navigation capability source**

The navigation implementation plan must produce one pure capability manifest consumed by Sidebar, App Header, and Command Palette adapters. Icons remain presentation-specific. The manifest must not replace server, action, or DAL authorization.

### Task 4: Gate downstream plan execution

**Files:**
- Verify: `docs/superpowers/plans/2026-09-08-p1-recent-context-resilience.md`
- Verify: `docs/superpowers/plans/2026-09-08-p1-next-best-action-resilience.md`
- Verify: `docs/superpowers/plans/2026-09-08-p1-products-resilience-and-role-truth.md`
- Verify: `docs/superpowers/plans/2026-09-08-p1-team-queue-resilience.md`
- Verify: `docs/superpowers/plans/2026-09-08-p1-analytics-partial-state.md`
- Verify: `docs/superpowers/plans/2026-09-08-p1-role-aware-navigation.md`

**Interfaces:**
- Consumes: downstream plans written by Sol or Luna
- Produces: an explicit approval or a list of contract conflicts before implementation

- [ ] **Step 1: Check every downstream plan links this plan as its Spec**

Expected: every plan that handles partial data or roles names `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md` in its header.

- [ ] **Step 2: Check for forbidden weakening**

Reject a downstream plan if it catches authorization/workspace errors as partial state, uses zero/empty as a failure fallback, describes uncertain NBA output as definitively best, or treats navigation visibility as authorization.

- [ ] **Step 3: Check ownership and file overlap**

Before parallel implementation, compare every plan's `Modify` and `Create` lists. Two active worktrees must not own the same application file. Shared-file changes require sequencing and an explicit handoff commit.

- [ ] **Step 4: Verify the documentation diff**

Run:

```text
git diff --check
git diff -- docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md
```

Expected: no whitespace errors and no unresolved placeholder language.
