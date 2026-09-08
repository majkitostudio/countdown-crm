# P1 Three-Role Browser Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an authenticated, three-role browser smoke report for one complete local working-day loop, covering role home, direct URLs, allowed/denied surfaces, persistence, empty/partial data, session isolation, errors, and cleanup without exposing secrets.

**Architecture:** Use three isolated browser contexts against the local app, one each for `operator`, `team_leader`, and `administrator`. Reuse the repository's existing local Auth/fixture setup and existing browser automation capability; keep local evidence separate from any linked-sandbox evidence. The smoke runner records sanitized steps and console/page errors, while the report records identities only by role and fixture IDs—not tokens, passwords, service-role values, or raw cookies.

**Tech Stack:** Next.js local runtime, Supabase local Auth/database, a browser runner explicitly confirmed by execution preflight (no repository Playwright dependency is assumed), TypeScript/JavaScript smoke runner, Markdown verification report, Vitest contract tests.

**Spec:** `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md` at commit `55b96b67de4bf52a2f2a79ac5a2d3dd0cb329c4b`, plus `docs/AKTUALNI_STAV_A_DESATERO.md` (P1 browser smoke requirement), `docs/DEVELOPMENT_WORKFLOW.md`, and the role-aware home/navigation contracts in `tests/role-aware-home.test.ts`, `tests/role-aware-navigation.test.ts`, and `tests/role-aware-page-authorization.test.ts`.

## Global Constraints

- Do not run the final smoke until the Recent Context, Products, Call Logs, and all other P1 integration changes are present in the tested branch.
- Before adding or running a smoke runner, prove that a browser automation runner is available and that disposable local role fixtures plus cleanup/read-back are available. Do not add a Playwright dependency merely to satisfy this plan; if the gate fails, stop and report the blocker.
- Use separate browser contexts for operator, team leader, and administrator; never reuse cookies or storage state across roles.
- Local mutations are allowed only in disposable local fixtures; linked-sandbox mutations require an explicit execution request and are out of scope by default.
- Report local and linked evidence in separate sections and never imply that local evidence proves linked behavior.
- Exercise role home, navigation and direct URLs, allowed and denied routes, one relevant persisted mutation per role, reload/read-back, empty/partial states, logout/session isolation, console/page errors, cleanup, and post-cleanup verification.
- Report only sanitized role/fixture identifiers; never include passwords, access tokens, service-role keys, cookies, raw Auth headers, or secret environment values.
- A unit/build pass is not a browser smoke result.

---

### Task 1: Define the smoke matrix and report sanitization contract

**Files:**
- Create: `tests/p1-three-role-browser-smoke.test.ts`
- Create after the runner/fixture gate passes: `scripts/p1-three-role-browser-smoke.mjs`
- Create: `docs/superpowers/reports/2026-09-08-p1-three-role-browser-smoke.md`
- Read-only references: `src/lib/auth/roleHome.ts`, `src/components/layout/sidebarNavigation.ts`, `src/components/layout/headerNavigation.ts`, protected `src/app/*/page.tsx` boundaries

**Interfaces:**
- Consumes: role home map `operator → /workspace`, `team_leader → /exceptions`, `administrator → /readiness`; navigation functions; a preflight-confirmed browser runner; and local fixture setup/cleanup commands.
- Produces: `SMOKE_MATRIX` with role, home path, allowed paths, denied paths, fixture-backed mutation/read-back steps, runner identity, and a sanitizer that rejects secret-shaped report content.

- [ ] **Step 1: Write the failing contract tests**

Assert the matrix contains at least:

```ts
expect(matrix.operator.home).toBe("/workspace");
expect(matrix.team_leader.home).toBe("/exceptions");
expect(matrix.administrator.home).toBe("/readiness");
expect(matrix.operator.denied).toEqual(expect.arrayContaining(["/exceptions", "/readiness", "/audit", "/analytics", "/team"]));
expect(matrix.team_leader.denied).toContain("/readiness");
expect(matrix.administrator.allowed).toContain("/products");
expect(matrix.operator.mutation.readBack).toBe("reload");
expect(matrix.runner.preflightRequired).toBe(true);
expect(matrix.administrator.mutation).toMatchObject({ fixtureBacked: true });
expect(report).not.toMatch(/service_role|sb_secret|access_token|refresh_token|password|cookie/i);
```

Also assert the runner names separate `local` and `linked_sandbox` evidence and contains cleanup/post-cleanup phases.

- [ ] **Step 2: Run the new test and verify RED**

Run: `npm test -- tests/p1-three-role-browser-smoke.test.ts`

Expected: FAIL because the matrix, runner, and report do not exist.

- [ ] **Step 3: Commit the red contract**

```powershell
git add tests/p1-three-role-browser-smoke.test.ts
git commit -m "test: define three-role browser smoke matrix"
```

### Task 2: Gate and implement the local isolated-context smoke runner

**Files:**
- Modify: `scripts/p1-three-role-browser-smoke.mjs`
- Modify: `tests/p1-three-role-browser-smoke.test.ts`

**Interfaces:**
- Consumes: a concrete preflight result naming the available browser runner and its capabilities, local base URL, disposable fixture IDs, role-specific credentials supplied only through environment variables, and the browser automation API.
- Produces: sanitized JSON/Markdown events with `role`, `path`, `action`, `result`, `fixtureId`, `errors`, and `evidenceEnvironment: "local"`; it must never serialize credentials or browser storage.

- [ ] **Step 1: Complete the runner and fixture preflight before writing the runner**

Run the environment-specific availability check for the browser runner selected by the execution host and prove that local operator, Team Leader, and Administrator fixtures can be created, read back, and cleaned up. Record the command, runner identity/version, fixture IDs, and cleanup result outside the report's secret-bearing environment. If no runner or safe disposable workflow is available, stop this plan with a concrete blocker; do not add `@playwright/test`, another browser dependency, or linked-sandbox mutations.

- [ ] **Step 2: Add a failing test for context isolation and error capture**

Assert that the runner creates three separate contexts, attaches `page.on("console")` and `page.on("pageerror")`, records each error with URL/role but not message payloads containing secrets, and closes every context in a `finally` block.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `npm test -- tests/p1-three-role-browser-smoke.test.ts`

Expected: FAIL on missing context factory, listeners, and cleanup implementation.

- [ ] **Step 4: Implement the minimal runner**

For each role:

1. Create a fresh browser context.
2. Authenticate through the existing local login flow using environment-provided disposable credentials; do not write those values to output.
3. Verify the role-specific home redirect and sidebar/command destinations.
4. Navigate both through visible navigation and direct URLs.
5. Verify allowed routes render and denied routes show the existing server permission boundary or redirect; do not accept a client-hidden button as denial evidence.
6. Perform one fixture-backed mutation for each role only after preflight proves that the action, fixture, role guard, cleanup, and read-back are safe. The operator and Team Leader examples may use the existing reminder and call-review flows; the Administrator action must be selected from an existing guarded admin flow during preflight and must not be assumed to be product edit.
7. Exercise empty and partial-data fixtures for Recent Context and Products; assert unavailable is visible and not `0`/empty success.
8. Log out through the UI, assert the protected URL redirects to `/login`, then prove a new role context does not inherit the previous session.
9. Capture console/page errors and fail the run on unexpected errors, while allowing explicitly catalogued local runtime warnings.
10. Run cleanup in `finally`, then read back each disposable fixture by ID and assert it is gone; record cleanup blockers as failures.

Do not add linked-sandbox writes. If the runner is invoked with a linked target, exit before authentication/mutation and print a clear authorization-required result.

- [ ] **Step 5: Run the runner contract tests**

Run: `npm test -- tests/p1-three-role-browser-smoke.test.ts`

Expected: PASS for matrix, sanitizer, context isolation, listener registration, and cleanup structure.

- [ ] **Step 6: Commit the runner**

```powershell
git add scripts/p1-three-role-browser-smoke.mjs tests/p1-three-role-browser-smoke.test.ts
git commit -m "test: add isolated three-role browser smoke runner"
```

### Task 3: Execute only after all P1 integration gates and write evidence

**Files:**
- Modify: `docs/superpowers/reports/2026-09-08-p1-three-role-browser-smoke.md`
- Modify only if the runner exposes a real defect: `scripts/p1-three-role-browser-smoke.mjs` and its focused test

**Interfaces:**
- Consumes: integrated P1 branch, local database reset/fixtures, smoke runner output, and any explicitly authorized linked-sandbox read-only evidence.
- Produces: a sanitized report with local results, optional separately labeled linked results, exact commands, fixture IDs, cleanup/read-back, and unresolved blockers.

- [ ] **Step 1: Verify the integration gate before launching the browser**

Run: `git log --oneline -- src/app/calls/page.tsx src/components/workspace/RecentContextRow.tsx src/components/workspace/recentContext.ts src/app/products/page.tsx; npm test; npm run lint; npm run typecheck; npm run build`

Expected: all P1 implementation commits are present and all commands exit 0. If Recent Context or Products is still waiting on Sol's contract, stop without running the final smoke.

- [ ] **Step 2: Reset local disposable state and run the local smoke**

Run the repository's established local reset/fixture setup, then run: `node scripts/p1-three-role-browser-smoke.mjs --base-url http://localhost:3000 --environment local`

Expected: three independent contexts, all role/home/URL/mutation/reload/empty/partial/logout/error/cleanup checks recorded; no secret values in output.

- [ ] **Step 3: Inspect and sanitize the report**

Run: `rg -n -i "service_role|sb_secret|access_token|refresh_token|password|cookie|authorization:|apikey" docs/superpowers/reports/2026-09-08-p1-three-role-browser-smoke.md`

Expected: no matches. If any match appears, remove the secret-bearing output and rerun the smoke/report generation; do not redact by leaving the value in a log artifact.

- [ ] **Step 4: Record linked evidence only when expressly authorized**

If an execution request explicitly authorizes linked sandbox work, use separate credentials/contexts and a separate report section named `linked_sandbox`. Otherwise record `linked_sandbox: not run — no execution authorization` and do not perform mutations.

- [ ] **Step 5: Run final report/test verification**

Run: `npm test -- tests/p1-three-role-browser-smoke.test.ts && git diff --check`

Expected: PASS and clean report formatting. The report must distinguish browser evidence from unit/build evidence.

- [ ] **Step 6: Commit the sanitized evidence**

```powershell
git add scripts/p1-three-role-browser-smoke.mjs tests/p1-three-role-browser-smoke.test.ts docs/superpowers/reports/2026-09-08-p1-three-role-browser-smoke.md
git commit -m "docs: record p1 three-role browser smoke"
```
