# Operator Workflows Through Priority 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dokončit pracovní smyčku operátora, Team Leadera a administrátora od post-call wrap-upu po Workspace Readiness, bez závislosti na aktivním Telnyx čísle.

**Architecture:** Zachováme existující workspace/role guardy, serverové DAL a atomické call RPC. Nové chování nejdřív vznikne jako typované read modely a čisté mapovací funkce, které se dají otestovat bez browseru; UI je potom pouze zobrazí a volá existující nebo nově přesně vymezené Server Actions. Exception Queue bude odvozená z existujících dat, zatímco reálný Team Leader Review a strukturovaný auditní kontext dostanou malé workspace-scoped tabulky/migrace.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/RLS, Server Actions, Vitest, ESLint, TypeScript compiler, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-09-05-operator-workflows-to-p5-design.md`

## Jak plán číst po lopatě

- Nejdřív uděláme nejmenší část a napíšeme test, který popíše požadované chování.
- Pak spustíme test, aby bylo vidět, že před změnou opravdu selhává.
- Potom přidáme minimum kódu, které test opraví.
- Po každé etapě spustíme kontrolu a uděláme samostatný commit.
- Telnyx číslo, živý hovor, nahrávka, transcription a Gemini se v tomto plánu neřeší.

## Global Constraints

- Databáze a server musí vynutit workspace a roli. Skrytí tlačítka, přímá URL ani znalost UUID nejsou bezpečnostní hranice.
- Kritické mutace zůstávají v serverové DAL, Server Actions nebo RPC.
- UI stav není důkaz persistence; kritické zápisy ověřujeme po reloadu a v databázi.
- Chybějící zdroj nesmí být prezentován jako prázdná množina nebo nulová hodnota bez pravdivého označení `unavailable`.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` zůstává pouze pro lokální vývoj; nové browser důkazy používají skutečný Auth účet a konkrétní workspace.
- Telnyx flag zůstává vypnutý a fallback softphone se nesmí označovat jako live telefonie.
- Každá nová migrace musí mít lokální replay, RLS kontrolu, linked dry-run a ověření po aplikaci.
- Do strukturovaného auditu se nesmí uložit heslo, service key, secret key, Telnyx credential, celý telefon ani jiný zbytečný osobní údaj.
- Stávající training `/training/reviews` zůstává review simulací; review reálných hovorů bude mít oddělenou route a jasný label.

---

## Fáze 0: Bezpečný start

### Task 0: Připravit izolované provádění a baseline

**Files:**
- Read: `PROJECT.md`, `Review.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/superpowers/specs/2026-09-05-operator-workflows-to-p5-design.md`
- Read: `docs/DEVELOPMENT_WORKFLOW.md`
- No application changes

**Interfaces:**
- Produces a clean isolated workspace, current branch record and a green baseline.

- [ ] **Step 1: Ověřit, že současný checkout je čistý a na správné větvi.**

Run:

```powershell
git status --short --branch
git log -3 --oneline
git rev-parse --show-toplevel
```

Expected: `main` points to the pushed P1 baseline and there are no unrelated working-tree changes.

- [ ] **Step 2: Založit izolované provádění podle using-git-worktrees.**

Use a project-local ignored worktree named `.worktrees/operator-workflows-to-p5` and branch `codex/operator-workflows-to-p5`. If the host already provides an isolated worktree, use that instead. Do not change application files on `main`.

- [ ] **Step 3: Install dependencies and run the baseline.**

Run separately in the isolated workspace:

```powershell
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: the baseline is green before feature work begins. Record exact test counts in the task notes.

- [ ] **Step 4: Commit only the approved design and plan.**

```powershell
git add docs/superpowers/specs/2026-09-05-operator-workflows-to-p5-design.md docs/superpowers/plans/2026-09-05-operator-workflows-to-p5.md
git commit -m "docs: plan operator workflows through priority five"
```

## Fáze 1: Post-call wrap-up

### Task 1: Vytvořit typovaný wrap-up model

**Files:**
- Create: `src/lib/postCallWrapUp.ts`
- Create: `tests/post-call-wrap-up-model.test.ts`
- Read/align: `src/lib/postCall.ts`, `src/lib/dal/callCompletion.ts`, `src/components/workspace/operatorNextAction.ts`

**Interfaces:**
- `PostCallWrapUpStep = "outcome" | "note" | "next_step" | "callback" | "order" | "submit"`
- `PostCallWrapUpInput` contains `outcome`, `note`, `failReason`, `nextStep`, `callbackScheduledAt` and `orderItems`.
- `getPostCallWrapUpState(input)` returns the next required step, validation message and whether submit is allowed.
- The model does not write to Supabase and does not decide an outcome for the operator.

- [ ] **Step 1: Write failing pure tests.**

Cover these exact cases:

```ts
expect(getPostCallWrapUpState({ outcome: null })).toMatchObject({ nextStep: "outcome", canSubmit: false });
expect(getPostCallWrapUpState({ outcome: "objection", failReason: null, note: "" })).toMatchObject({ nextStep: "note", canSubmit: false });
expect(getPostCallWrapUpState({ outcome: "no_answer", note: "", nextStep: "continue" })).toMatchObject({ nextStep: "submit", canSubmit: true });
expect(getPostCallWrapUpState({ outcome: "order_placed", orderItems: [] })).toMatchObject({ nextStep: "order", canSubmit: false });
```

Also assert that a callback date is required only for `followup_scheduled`, a fail reason is accepted only for the negative outcome, and a second evaluation does not mutate the input.

- [ ] **Step 2: Run the focused test and confirm fail-first.**

Run: `npm test -- tests/post-call-wrap-up-model.test.ts`

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the minimal pure model.**

Reuse `validateCallFailFields` and existing `CompletionOutcome` vocabulary. Keep `nextStep` explicit instead of inferring it from UI labels. Return safe validation messages without raw Supabase errors.

- [ ] **Step 4: Run the focused and existing post-call tests.**

```powershell
npm test -- tests/post-call-wrap-up-model.test.ts tests/post-call-fail.test.ts tests/post-call-wrap-up-contract.test.ts tests/post-call-read-model-contract.test.ts
```

Expected: all focused tests pass and existing Fail details remain compatible.

- [ ] **Step 5: Commit the model.**

```powershell
git add src/lib/postCallWrapUp.ts tests/post-call-wrap-up-model.test.ts
git commit -m "feat: define post-call wrap-up state"
```

### Task 2: Sjednotit wrap-up v Operator Console

**Files:**
- Create: `src/components/workspace/PostCallWrapUpPanel.tsx`
- Modify: `src/app/workspace/page.tsx`
- Modify: `src/components/workspace/OperatorCallControls.tsx`
- Modify: `src/components/workspace/CallbackScheduleModal.tsx` only to embed the same pending state and error contract
- Test: `tests/post-call-wrap-up-ui-contract.test.ts`

**Interfaces:**
- `PostCallWrapUpPanel` receives `activeLead`, current call state, available products, pending flag and callbacks for `onSubmit`, `onOpenCallback`, `onCreateOrder`.
- It owns only local form state; server completion remains in `WorkspaceContent.completeCall` and `completeLeadCallAction`.
- The panel renders one primary submit action and does not create a second completion path.

- [ ] **Step 1: Write failing UI contract tests.**

Assert that the panel contains one primary completion button, shows the selected outcome, exposes note/fail reason when required, disables submit while pending, and does not render a second independent call-completion button.

- [ ] **Step 2: Run focused UI tests and confirm fail-first.**

Run: `npm test -- tests/post-call-wrap-up-ui-contract.test.ts`

Expected: FAIL because the new panel and contract do not exist.

- [ ] **Step 3: Implement the panel and wire the existing completion callback.**

Move duplicate local outcome handling out of `OperatorCallControls` only where the new panel takes ownership. Preserve keyboard shortcuts, Fail validation, callback focus restoration, order creation and the `completionInFlightRef` guard.

- [ ] **Step 4: Verify all post-call paths.**

```powershell
npm test -- tests/post-call-wrap-up-ui-contract.test.ts tests/post-call-fail.test.ts tests/operator-next-action-ui-contract.test.ts tests/lead-queue-contract.test.ts
npm run lint
npm run typecheck
```

Expected: normal outcome, Fail, callback and order paths remain server-backed and no duplicate submit is possible.

- [ ] **Step 5: Commit the UI slice.**

```powershell
git add src/components/workspace/PostCallWrapUpPanel.tsx src/app/workspace/page.tsx src/components/workspace/OperatorCallControls.tsx src/components/workspace/CallbackScheduleModal.tsx tests/post-call-wrap-up-ui-contract.test.ts
git commit -m "feat: streamline post-call wrap-up"
```

### Task 3: Ověřit wrap-up autentizovaně

**Files:**
- Read: `scripts/provision-test-team-leader.mjs`
- Create: `scripts/provision-test-operator.mjs` only if the existing disposable operator setup cannot be reused safely
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md` and `PROJECT.md` only after evidence

- [ ] **Step 1: Provision a disposable real Auth operator and use the existing sandbox lead.**

Do not enable demo auth. Use a temporary password through the local environment and never print it.

- [ ] **Step 2: Browser-test the full wrap-up.**

Run the fallback path: sign in, receive/claim a lead, start call, end call, select an outcome, submit once, reload `/workspace`, and confirm no second call or duplicate outcome appears.

- [ ] **Step 3: Read back `lead_queue_items` and `calls`.**

Confirm the same `queue_item_id`, one new call, expected outcome, duration, final queue state and no duplicate rows.

- [ ] **Step 4: Clean up every temporary Auth user and test artifact.**

Confirm the disposable users are absent and the queue is not left assigned. Keep only intentionally reusable sandbox fixtures.

## Fáze 2: Conversation Brief

### Task 4: Vytvořit deterministický Conversation Brief read model

**Files:**
- Create: `src/lib/dal/conversationBrief.ts`
- Create: `src/components/workspace/conversationBrief.ts`
- Create: `tests/conversation-brief.test.ts`
- Read/reuse: `src/lib/dal/leadQueue.ts`, `src/lib/dal/leadNotes.ts`, `src/lib/dal/calendar.ts`, `src/lib/dal/callCompletion.ts`, `src/lib/productScripts.ts`

**Interfaces:**
- `ConversationBriefDTO` contains `lead`, `queueReason`, `lastContact`, `lastOutcome`, `lastNote`, `callback`, `productContext`, `nextSafeStep` and `sources`.
- Each optional source has `available` or `unavailable` state; absent data after a successful query is represented as `null` or an empty list with an explicit `sourceState`.
- `getConversationBriefForWorkspace(leadId: string, workspaceId?: string): Promise<ConversationBriefDTO>` enforces the current workspace and operator visibility.

- [ ] **Step 1: Write failing mapping tests using fixtures only.**

Cover a full brief, no history, unavailable notes, unavailable callback source, operator access to current lead only, and a lead from another workspace rejected as `FORBIDDEN` or `NOT_FOUND` according to existing DAL conventions.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/conversation-brief.test.ts`

Expected: FAIL because the DTO and builder do not exist.

- [ ] **Step 3: Implement independent source loading.**

Use existing workspace-scoped functions and `Promise.allSettled` where independent sources are loaded. Never synthesize a queue reason or promise from a missing source. The safe next step is a deterministic label derived from current assignment state and approved script availability.

- [ ] **Step 4: Run focused and role tests.**

```powershell
npm test -- tests/conversation-brief.test.ts tests/customer-360.test.ts tests/operator-next-action-ui-contract.test.ts
npm run lint
npm run typecheck
```

- [ ] **Step 5: Commit the read model.**

```powershell
git add src/lib/dal/conversationBrief.ts src/components/workspace/conversationBrief.ts tests/conversation-brief.test.ts
git commit -m "feat: add deterministic conversation brief"
```

### Task 5: Zobrazit Brief před hovorem

**Files:**
- Create: `src/components/workspace/ConversationBriefCard.tsx`
- Modify: `src/app/workspace/page.tsx`
- Modify: `src/components/workspace/OperatorNextActionPanel.tsx` only for one link/placement to the brief
- Test: `tests/conversation-brief-ui-contract.test.ts`

- [ ] **Step 1: Write the failing UI contract.**

Assert that the card shows the last outcome, last note, callback/none, safe next step and a source-unavailable label when applicable. Assert that no `AI`, `predicted`, `recommended by model` or invented urgency label is present.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/conversation-brief-ui-contract.test.ts`

- [ ] **Step 3: Add the card above the active call controls.**

Render only for an active operator lead. Keep the compact client profile and full timeline available below it. Loading and source errors must be visible without replacing the whole Console.

- [ ] **Step 4: Verify build and browser smoke.**

```powershell
npm test -- tests/conversation-brief-ui-contract.test.ts tests/operator-next-action-ui-contract.test.ts
npm run lint
npm run typecheck
npm run build
```

Browser: sign in as disposable operator, confirm the Brief is visible before call, then reload and confirm the same server-derived values.

- [ ] **Step 5: Commit the UI slice.**

```powershell
git add src/components/workspace/ConversationBriefCard.tsx src/app/workspace/page.tsx src/components/workspace/OperatorNextActionPanel.tsx tests/conversation-brief-ui-contract.test.ts
git commit -m "feat: show conversation brief in operator console"
```

## Fáze 3: Team Leader Exception Queue

### Task 6: Sestavit odvozený Exception Queue model

**Files:**
- Create: `src/lib/dal/exceptionQueue.ts`
- Create: `src/components/team/exceptionQueue.ts`
- Create: `tests/exception-queue.test.ts`
- Read/reuse: `src/lib/dal/leadQueue.ts`, `src/lib/dal/calendar.ts`, `src/lib/workflows/dispatcher.ts`, `src/lib/dal/productScripts.ts`, relevant existing types

**Interfaces:**
- `ExceptionKind = "stuck_assignment" | "awaiting_outcome" | "expired_lease" | "overdue_callback" | "failed_workflow" | "missing_published_script"`.
- `ExceptionSeverity = "critical" | "high" | "medium"`.
- `ExceptionQueueItem` contains `id`, `kind`, `title`, `reason`, `severity`, `createdAt`, `ageSeconds`, `owner`, `lead`, `safeAction` and `source`.
- `listExceptionQueueForWorkspace(workspaceId?: string): Promise<ExceptionQueueItem[]>` is available only to Team Leaders and Administrators.

- [ ] **Step 1: Write failing pure classification tests.**

Cover each exception kind, severity ordering, deduplication of one lead with multiple signals, a healthy queue returning zero exceptions, and unavailable optional sources marked as unavailable rather than converted to zero exceptions.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/exception-queue.test.ts`

- [ ] **Step 3: Implement classification over existing read models.**

Use existing queue action eligibility for `release`, `reassign`, and `reopen`. Do not add a new `resolved` flag or duplicate data table. For failed workflows and missing scripts, link to the existing detail page and label the action as inspection-only until a safe mutation exists.

- [ ] **Step 4: Verify role and workspace boundaries.**

```powershell
npm test -- tests/exception-queue.test.ts tests/lead-queue-contract.test.ts tests/role-permissions.test.ts
npm run lint
npm run typecheck
```

Assert that operator access is rejected and a supplied foreign workspace ID cannot change the result.

- [ ] **Step 5: Commit the model.**

```powershell
git add src/lib/dal/exceptionQueue.ts src/components/team/exceptionQueue.ts tests/exception-queue.test.ts
git commit -m "feat: classify team leader exceptions"
```

### Task 7: Přidat Exception Queue do Team Leader plochy

**Files:**
- Create: `src/components/team/TeamExceptionQueuePanel.tsx`
- Modify: `src/app/team/page.tsx`
- Modify: `src/components/team/TeamQueuePanel.tsx` only to link existing queue operations
- Create: `tests/team-exception-queue-ui-contract.test.ts`

- [ ] **Step 1: Write the failing UI contract.**

Assert the page heading, exception count, severity labels, reason, owner, age and safe action. Assert that an empty state says there are no current exceptions rather than pretending the queue is empty or healthy without context.

- [ ] **Step 2: Implement the panel with refresh and action feedback.**

The panel calls existing Server Actions for release/reassign/reopen and refreshes its read model after success. Inspection-only items link to the relevant lead, workflow or script page. Errors remain visible and do not clear unrelated items.

- [ ] **Step 3: Add Team Leader navigation entry.**

Use `/team` as the first route so the existing Team Queue and new Exception Queue share one guarded page. The navigation label must say `Team Queue & Exceptions`; the route remains inaccessible to operators through server guards.

- [ ] **Step 4: Verify.**

```powershell
npm test -- tests/team-exception-queue-ui-contract.test.ts tests/team-queue-panel.test.ts
npm run lint
npm run typecheck
npm run build
```

- [ ] **Step 5: Commit.**

```powershell
git add src/components/team/TeamExceptionQueuePanel.tsx src/app/team/page.tsx src/components/team/TeamQueuePanel.tsx tests/team-exception-queue-ui-contract.test.ts
git commit -m "feat: add team leader exception queue"
```

## Fáze 4: Role-aware plochy, navigace a Workspace Readiness

### Task 8: Sjednotit role-aware navigaci a výchozí plochy

**Files:**
- Create: `src/components/layout/navigation.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/headerNavigation.ts`
- Modify: `src/app/page.tsx`
- Create: `src/components/layout/RoleHome.tsx`
- Create: `tests/navigation-role-contract.test.ts`

**Interfaces:**
- `NavigationItem` contains `label`, `href`, `icon`, `roles`, `daily`, `truthLabel`.
- `getNavigationForRole(role)` is the only source used by Sidebar and command palette.
- `getRoleHomePath(role)` returns `/workspace`, `/team` or `/readiness` for operator, Team Leader or Administrator.

- [ ] **Step 1: Write failing role navigation tests.**

Assert the exact daily items for each role, that Team Leader sees `/team`, that operator does not see `/analytics`, `/audit`, `/monitor` or `/workflows`, and that administrator sees `/readiness`. Assert labels distinguish simulation from live/unavailable surfaces.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/navigation-role-contract.test.ts`

- [ ] **Step 3: Replace duplicated navigation definitions.**

Move the shared item metadata into `navigation.ts`. Keep route guards unchanged. Convert the root page to an authenticated server-aware role home; unauthenticated users still go to login through the existing shell behavior.

- [ ] **Step 4: Verify direct URL security.**

```powershell
npm test -- tests/navigation-role-contract.test.ts tests/role-permissions.test.ts
npm run lint
npm run typecheck
```

Browser-check all three roles: navigation and starting route match the role, while a manually entered restricted URL shows the existing unavailable/forbidden state.

- [ ] **Step 5: Commit.**

```powershell
git add src/components/layout/navigation.ts src/components/layout/Sidebar.tsx src/components/layout/headerNavigation.ts src/app/page.tsx src/components/layout/RoleHome.tsx tests/navigation-role-contract.test.ts
git commit -m "feat: add role-aware home and navigation"
```

### Task 9: Napojit status operátora na serverovou presence

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/app/actions/leadQueue.ts` only if a typed wrapper is needed
- Modify: `src/lib/dal/leadQueue.ts` only if a typed wrapper is needed
- Create: `tests/operator-presence-ui-contract.test.ts`

- [ ] **Step 1: Write failing presence contract tests.**

Assert that choosing Ready, In Call or Break calls the server action, shows pending/error states, and does not leave a new local-only status after reload. Assert that presence cannot be changed while an active call violates the existing server rule.

- [ ] **Step 2: Implement server-backed status controls for operators.**

Use `setOperatorPresenceAction`. The UI must reflect the server response and show an honest unavailable state if the write fails. Team Leaders and Administrators do not get a fake operator shift selector.

- [ ] **Step 3: Verify and commit.**

```powershell
npm test -- tests/operator-presence-ui-contract.test.ts tests/lead-queue-contract.test.ts
npm run lint
npm run typecheck
git add src/components/layout/Sidebar.tsx src/app/actions/leadQueue.ts src/lib/dal/leadQueue.ts tests/operator-presence-ui-contract.test.ts
git commit -m "fix: persist operator presence from sidebar"
```

### Task 10: Vytvořit Workspace Readiness read model a admin page

**Files:**
- Create: `src/lib/dal/workspaceReadiness.ts`
- Create: `src/components/readiness/WorkspaceReadinessPanel.tsx`
- Create: `src/app/readiness/page.tsx`
- Create: `tests/workspace-readiness.test.ts`
- Create: `tests/workspace-readiness-ui-contract.test.ts`
- Read/reuse: `src/lib/dal/calendar.ts`, `src/lib/dal/wallet.ts`, `src/lib/dal/leadQueue.ts`, Product Script DAL, workflow DAL and existing environment checks

**Interfaces:**
- `ReadinessStatus = "ready" | "needs_attention" | "blocked"`.
- `WorkspaceReadinessCheck` contains `key`, `label`, `status`, `summary`, `details`, `checkedAt` and `actionHref`.
- `getWorkspaceReadinessForWorkspace(): Promise<WorkspaceReadinessDTO>` is administrator-only.

- [ ] **Step 1: Write failing read-model tests.**

Cover healthy Calendar/Wallet, empty but available queue, unavailable Calendar source, missing published script, disabled Telnyx with external-blocker detail, migration mismatch, and a forbidden non-admin request.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/workspace-readiness.test.ts tests/workspace-readiness-ui-contract.test.ts`

- [ ] **Step 3: Implement checks with explicit unavailable states.**

Reuse existing DAL functions where possible. Do not shell out from a request to run migrations. Migration/schema status is a check supplied by a safe server-side configuration or recorded deployment status; if no reliable runtime source exists, the result is `needs_attention` with the exact explanation, not a fabricated `ready`.

- [ ] **Step 4: Build the admin page.**

Show one card per check, summary first, details on demand, refresh action and links to the relevant surface. Clearly separate application health from external Telnyx readiness.

- [ ] **Step 5: Verify and commit.**

```powershell
npm test -- tests/workspace-readiness.test.ts tests/workspace-readiness-ui-contract.test.ts tests/calendar-runtime.test.ts tests/wallet-runtime.test.ts
npm run lint
npm run typecheck
npm run build
git add src/lib/dal/workspaceReadiness.ts src/components/readiness/WorkspaceReadinessPanel.tsx src/app/readiness/page.tsx tests/workspace-readiness.test.ts tests/workspace-readiness-ui-contract.test.ts
git commit -m "feat: add workspace readiness diagnostics"
```

## Fáze 5: Reálný Team Leader Review a auditní kontext

### Task 11: Přidat workspace-scoped call reviews migrací

**Files:**
- Create via `npx supabase migration new call_reviews`
- Create via CLI: one generated `call_reviews` migration under `supabase/migrations/`
- Modify: `src/lib/supabase/types.ts`
- Create: `tests/call-reviews-migration.test.ts`

**Interfaces:**
- Table `public.call_reviews` has `id uuid`, `workspace_id uuid not null`, `call_id uuid not null`, `reviewer_id uuid not null`, `rating text not null`, `feedback text not null`, `created_at timestamptz`, `updated_at timestamptz`, unique `(workspace_id, call_id, reviewer_id)` and foreign keys to the workspace/call/reviewer records.
- Allowed ratings are `pass`, `coach`, `critical`.
- Team Leaders and Administrators may select and insert/update reviews only within their workspace; operators have no access.

- [ ] **Step 1: Write the failing migration contract.**

Assert the migration creates the exact table, enables RLS, grants only the required authenticated access and defines the unique review constraint and rating check.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/call-reviews-migration.test.ts`

- [ ] **Step 3: Create the migration with the official Supabase CLI.**

Run `npx supabase migration new call_reviews`, then edit only the generated migration. Do not edit `supabase/schema.sql` as a source of truth.

- [ ] **Step 4: Replay and inspect locally.**

```powershell
npx supabase db reset
npx supabase test db --local
npm test -- tests/call-reviews-migration.test.ts
```

- [ ] **Step 5: Push only after dry-run review.**

```powershell
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase db push --linked --dry-run
```

- [ ] **Step 6: Commit the migration and generated types.**

```powershell
git add supabase/migrations src/lib/supabase/types.ts tests/call-reviews-migration.test.ts
git commit -m "feat: store workspace-scoped call reviews"
```

### Task 12: Zobrazit review skutečných callů a uložit coaching

**Files:**
- Create: `src/lib/dal/callReviews.ts`
- Create: `src/app/actions/callReviews.ts`
- Create: `src/app/team/reviews/page.tsx`
- Create: `src/components/team/CallReviewPanel.tsx`
- Create: `tests/call-reviews.test.ts`
- Create: `tests/call-reviews-ui-contract.test.ts`
- Modify: `src/components/layout/navigation.ts`

- [ ] **Step 1: Write failing DAL and UI tests.**

Cover listing calls workspace-scoped, filtering calls with no review, loading lead/operator/script context, upserting one review, rejecting operator and foreign workspace access, and keeping `/training/reviews` labeled as training-only.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/call-reviews.test.ts tests/call-reviews-ui-contract.test.ts`

- [ ] **Step 3: Implement the DAL and Server Actions.**

Select only the fields needed for review. Resolve the used Product Script version from persisted call context where available; when it is not persisted, show `Script version unavailable` rather than current script as if it had been used during the call.

- [ ] **Step 4: Implement the Team Leader Review page.**

Use `/team/reviews`, label it `Real call review`, show call/outcome/duration/operator/lead, display available transcript status honestly, and provide rating plus feedback with one idempotent save action.

- [ ] **Step 5: Verify and commit.**

```powershell
npm test -- tests/call-reviews.test.ts tests/call-reviews-ui-contract.test.ts tests/training-review-contract.test.ts
npm run lint
npm run typecheck
npm run build
git add src/lib/dal/callReviews.ts src/app/actions/callReviews.ts src/app/team/reviews/page.tsx src/components/team/CallReviewPanel.tsx src/components/layout/navigation.ts tests/call-reviews.test.ts tests/call-reviews-ui-contract.test.ts
git commit -m "feat: review real calls with team leader coaching"
```

### Task 13: Rozšířit auditní log o strukturovaný kontext

**Files:**
- Create via `npx supabase migration new audit_context`
- Create via CLI: one generated `audit_context` migration under `supabase/migrations/`
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/dal/audit.ts`
- Modify: `src/app/actions/audit.ts`
- Modify: `src/lib/audit.ts`
- Modify: `src/app/audit/page.tsx`
- Create: `tests/audit-context.test.ts`
- Create: `tests/audit-context-ui-contract.test.ts`

**Interfaces:**
- Add nullable `target_resource_id uuid`, `before_state jsonb`, `after_state jsonb`, `reason text` to `public.audit_logs`.
- `AuditLogDTO` exposes these fields as nullable values.
- `CreateAuditLogInput` accepts `targetResourceId`, `beforeState`, `afterState`, `reason` and rejects credential-shaped keys before insert.

- [ ] **Step 1: Write failing security and mapping tests.**

Assert structured fields map correctly, existing legacy rows remain valid, oversized reason/state is rejected, keys matching `password`, `token`, `secret`, `api_key` or `credential` are rejected, and audit listing remains team-leader/admin-only.

- [ ] **Step 2: Run fail-first.**

Run: `npm test -- tests/audit-context.test.ts tests/audit-context-ui-contract.test.ts`

- [ ] **Step 3: Create and replay the migration.**

Use `npx supabase migration new audit_context`, add nullable columns and indexes only where needed for workspace/time queries, reset local DB, run local DB tests, inspect RLS and linked dry-run, then apply and re-check the linked target.

- [ ] **Step 4: Update DAL and UI.**

Show target, reason and before/after summary in an expandable audit detail. Keep the existing CSV export safe by serializing structured JSON with controlled fields and without raw credentials.

- [ ] **Step 5: Add context to critical mutations.**

Update queue release/reassign/reopen, wallet governance, script publish/archive, callback status changes and call review save to send the relevant target and safe before/after context. Do not add an audit event for every harmless read.

- [ ] **Step 6: Verify and commit.**

```powershell
npm test -- tests/audit-context.test.ts tests/audit-context-ui-contract.test.ts tests/audit-contract.test.ts
npm run lint
npm run typecheck
npm run build
git add supabase/migrations src/lib/supabase/types.ts src/lib/dal/audit.ts src/app/actions/audit.ts src/lib/audit.ts src/app/audit/page.tsx tests/audit-context.test.ts tests/audit-context-ui-contract.test.ts
git commit -m "feat: add structured audit context"
```

### Task 14: Finální role, persistence a dokumentační důkaz

**Files:**
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Modify: `PROJECT.md`
- Modify: `Review.md`
- Create: `docs/superpowers/reports/2026-09-05-operator-workflows-to-p5-verification.md`

- [ ] **Step 1: Run the complete repository verification.**

Run separately:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npx supabase test db --local
npx supabase migration list --linked
npx supabase db push --linked --dry-run
git diff --check
```

- [ ] **Step 2: Run the authenticated role matrix.**

Use disposable real Auth accounts and document only role-safe summaries:

| Scenario | Expected result |
|---|---|
| Operator opens Console and Brief | allowed |
| Operator opens `/team`, `/readiness`, `/team/reviews`, `/audit` | forbidden/unavailable |
| Team Leader opens Exception Queue and real call review | allowed |
| Team Leader opens `/readiness` | forbidden/unavailable unless explicitly granted by policy |
| Administrator opens Readiness, Team Queue, Review and Audit | allowed |
| Any role supplies foreign workspace ID | no cross-workspace data or mutation |
| Telnyx disabled | honest external blocker, no live claim |

- [ ] **Step 3: Run persistence checks.**

Reload after saving wrap-up, Brief source data, presence, call review and audit context. Read back the exact workspace-scoped rows and confirm repeated submit/reload does not duplicate them.

- [ ] **Step 4: Write the verification report.**

Use these exact conclusion labels:

```markdown
## Conclusion
- Post-call wrap-up: verified / partially verified / blocked
- Conversation Brief: verified / partially verified / blocked
- Team Leader Exception Queue: verified / partially verified / blocked
- Role-aware home and navigation: verified / partially verified / blocked
- Workspace Readiness: verified / partially verified / blocked
- Real Team Leader Review: verified / partially verified / blocked
- Structured audit context: verified / partially verified / blocked
- Telnyx live pilot: intentionally deferred pending external number verification
- Overall status: verified / partially verified / blocked
- Next priority: Telnyx external verification, then Gemini only after live call evidence
```

- [ ] **Step 5: Update canonical documentation only from evidence.**

Mark only the checklist items actually demonstrated. State clearly which browser flows used fallback simulation and never call them Telnyx proof.

- [ ] **Step 6: Commit the final report.**

```powershell
git add docs/superpowers/reports/2026-09-05-operator-workflows-to-p5-verification.md docs/AKTUALNI_STAV_A_DESATERO.md PROJECT.md Review.md
git commit -m "docs: verify operator workflows through priority five"
```

## Execution checkpoints

- Checkpoint A: post-call wrap-up passes focused tests and one authenticated fallback persistence run.
- Checkpoint B: Conversation Brief is visible and honest before a call.
- Checkpoint C: Exception Queue shows only actionable exceptions and preserves existing queue actions.
- Checkpoint D: role-aware home/navigation and server-backed presence pass the role matrix.
- Checkpoint E: Workspace Readiness is honest about linked health and Telnyx external status.
- Checkpoint F: real call review and structured audit context survive reload and read-back.

If a checkpoint fails, stop at that checkpoint, record the exact failure and fix it before proceeding. Do not skip to Telnyx or Gemini to hide an unfinished operational loop.

## Self-review

- Every user-approved area has at least one implementation task and one verification checkpoint.
- Exception Queue is derived data; it does not create a second queue of truth.
- Conversation Brief is deterministic and has no AI dependency.
- Existing training reviews remain separate from reviews of real calls.
- New persistence is limited to call reviews and structured audit context.
- No task asks for a live Telnyx number or provider verification.
- Every route remains guarded by server-side workspace and role checks.
- The next post-plan work is intentionally outside scope: external Telnyx verification and, only after that, Gemini.
