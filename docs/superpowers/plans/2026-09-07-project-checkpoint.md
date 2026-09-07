# Project Checkpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the complete current project and replace the mixed backlog with one evidence-backed priority order.

**Architecture:** Treat the checkpoint as a read-only evidence pass followed by documentation-only reconciliation. Keep findings traceable to code, database checks, test output, or an explicitly named unverified dependency.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase/Postgres, Markdown documentation.

**Spec:** `docs/superpowers/specs/2026-09-07-project-checkpoint-design.md`

## Global Constraints

- Do not implement product behavior or change database schema during the checkpoint.
- Do not expose secrets or copy target-specific credentials into documentation.
- Keep Team Leader Review and its linked verification closed as completed work.
- Treat team structure as a prerequisite for team-scoped Results and reporting.
- Separate repository evidence, local runtime evidence, linked sandbox evidence, and external blockers.
- Preserve Telnyx, Gemini, custom objects, Deals, Wallet payout, and training boundaries unless evidence requires a priority correction.

---

### Task 1: Capture the verified baseline

**Files:**
- Create: `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

- [x] Record branch, commit, route/table/migration/test inventory and current linked migration parity.
- [x] Run application tests, lint, typecheck, build, local database tests and dependency audit.
- [x] Record exact results without converting warnings into successes or blockers.

### Task 2: Audit product, role and navigation truthfulness

**Files:**
- Modify: `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

- [x] Trace operator, Team Leader and administrator entry points and daily actions.
- [x] Identify inaccessible, duplicated, placeholder, simulated or misleading surfaces.
- [x] Verify that current navigation and server guards agree.

### Task 3: Audit data, security and team-readiness boundaries

**Files:**
- Modify: `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

- [x] Inventory workspace scope, role checks, RLS, grants, privileged functions and advisor findings.
- [x] Prove whether `teams` or team membership exists anywhere in the current schema.
- [x] Map every feature currently using workspace-wide data that will need a future team boundary.

### Task 4: Audit runtime, maintainability and documentation drift

**Files:**
- Modify: `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

- [x] Find partial-failure coupling, hardcoded/demo data, empty implementations and external integration gaps.
- [x] Record large or high-coupling files only when they create a concrete delivery risk.
- [x] Compare active documentation claims, counts and priorities with current evidence.

### Task 5: Publish one prioritized backlog

**Files:**
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md`
- Modify: `docs/README.md`
- Modify: `docs/superpowers/reports/2026-09-07-project-checkpoint.md`

- [x] Order remaining work as P0 through P4, followed by external blockers and frozen scope.
- [x] Promote team structure to P2 and state its dependencies and completion evidence.
- [x] Remove or correct stale completed items and contradictory counts.
- [x] Keep `PROJECT.md` concise and point to the detailed backlog as the single source of ordering.

### Task 6: Verify and integrate the checkpoint

**Files:**
- Modify only if evidence requires correction: checkpoint documentation files.

- [x] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx supabase test db`, and `git diff --check`.
- [x] Review the complete diff for unsupported claims and secret leakage.
- [ ] Commit the documentation-only checkpoint, push the branch, and open a Pull Request against `main`.

## Completion Definition

The checkpoint is complete when the report names verified strengths and unresolved risks, the active backlog has one unambiguous order, team structure is a first-class prerequisite, repository checks are green, and no product behavior or schema change is included in the checkpoint diff.
