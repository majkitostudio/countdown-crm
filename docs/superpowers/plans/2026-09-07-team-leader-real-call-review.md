# Team Leader Real Call Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manager-only review flow for persisted CRM calls with truthful call evidence, exact future script snapshots, immutable corrections, and auditable before/after history.

**Architecture:** Extend the existing call, telephony-session, Exception Queue, and audit flows instead of creating a parallel review inbox. Capture the server-resolved script when a telephony session starts, link that session to the persisted call when completion succeeds, and store human reviews as append-only revisions protected by RLS and database constraints.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Supabase Postgres 17, Supabase SSR client, pgTAP, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-07-team-leader-real-call-review-design.md`

## Global Constraints

- Execute inline in this session; do not dispatch agents.
- Start from commit `d0a02d7`, whose parent is the requested baseline `34be446`.
- Follow RED → GREEN → REFACTOR for every production behavior and record the expected failure before implementation.
- Never infer a historical script version or an Exception Queue-to-call link.
- Only `team_leader` and `administrator` in the call workspace may read or write review revisions.
- Review rows are append-only; application roles receive no `UPDATE` or `DELETE` permission.
- AI cannot create a verdict or a review revision.
- Keep `/training/reviews` unchanged and clearly separate from real-call review.
- Do not claim that a simulation or local SIP record is a live Telnyx call.
- Create the migration filename with `npx supabase migration new team_leader_real_call_review`; do not invent a timestamped filename.
- Enable RLS and add explicit grants for every new public table or function.
- Do not expose a service-role key or other secret to client code.

---

### Task 1: Preserve every real transcript representation

**Files:**
- Create: `src/lib/callTranscript.ts`
- Create: `tests/call-transcript.test.ts`
- Modify: `src/lib/calls.ts`
- Modify: `src/components/calls/CallDetailDrawer.tsx`

**Interfaces:**
- Produces: `parseCallTranscript(value: string | null): CallTranscript`
- Produces: `CallTranscript = { kind: "structured"; entries: TranscriptEntry[] } | { kind: "plain_text"; text: string } | { kind: "unavailable" }`
- Consumes later: Task 6 uses `CallTranscript` when rendering review evidence.

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseCallTranscript } from "@/lib/callTranscript";

describe("parseCallTranscript", () => {
  it("keeps a valid structured transcript", () => {
    const raw = JSON.stringify([{ speaker: "operator", timestamp: "00:01", text: "Dobrý den" }]);
    expect(parseCallTranscript(raw)).toEqual({
      kind: "structured",
      entries: [{ speaker: "operator", timestamp: "00:01", text: "Dobrý den" }],
    });
  });

  it("keeps a non-empty legacy transcript as plain text", () => {
    expect(parseCallTranscript("Operátor: Dobrý den\nKlient: Dobrý den")).toEqual({
      kind: "plain_text",
      text: "Operátor: Dobrý den\nKlient: Dobrý den",
    });
  });

  it("marks null and whitespace-only values unavailable", () => {
    expect(parseCallTranscript(null)).toEqual({ kind: "unavailable" });
    expect(parseCallTranscript("   ")).toEqual({ kind: "unavailable" });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/call-transcript.test.ts`

Expected: FAIL because `@/lib/callTranscript` does not exist.

- [ ] **Step 3: Implement the discriminated transcript parser**

```ts
export interface TranscriptEntry {
  speaker: "operator" | "customer";
  timestamp: string;
  text: string;
}

export type CallTranscript =
  | { kind: "structured"; entries: TranscriptEntry[] }
  | { kind: "plain_text"; text: string }
  | { kind: "unavailable" };

export function parseCallTranscript(value: string | null): CallTranscript {
  const text = value?.trim();
  if (!text) return { kind: "unavailable" };
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every(isTranscriptEntry)) {
      return { kind: "structured", entries: parsed };
    }
  } catch {
    // A non-empty legacy transcript remains real evidence as plain text.
  }
  return { kind: "plain_text", text };
}
```

Add a local `isTranscriptEntry` type guard that requires a known speaker and string timestamp/text. Update `CallRecord.transcript` and the existing drawer to render structured entries, escaped plain text, or the unavailable notice.

- [ ] **Step 4: Verify GREEN and existing call UI behavior**

Run: `npm test -- tests/call-transcript.test.ts tests/calls-fail-contract.test.ts tests/post-call-read-model-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the green slice**

```powershell
git add src/lib/callTranscript.ts src/lib/calls.ts src/components/calls/CallDetailDrawer.tsx tests/call-transcript.test.ts
git commit -m "fix: preserve legacy call transcripts"
```

### Task 2: Define immutable review revisions and atomic audit

**Files:**
- Create: `supabase/tests/database/call_review_revisions_test.sql`
- Create: `supabase/tests/database/call_review_revisions_rls_test.sql`
- Create via CLI: the timestamped migration returned by `npx supabase migration new team_leader_real_call_review`
- Modify after local schema verification: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces table: `public.call_review_revisions`
- Produces RPC: `public.record_call_review_revision(p_call_id uuid, p_expected_revision integer, p_verdict text, p_coaching_note text, p_correction_reason text default null)`
- RPC returns: the inserted `public.call_review_revisions` row
- Produces audit actions: `CALL_REVIEW_COMPLETED`, `CALL_REVIEW_CORRECTED`

- [ ] **Step 1: Write failing pgTAP behavior tests**

Create fixtures for two workspaces, an operator, a Team Leader, an administrator, and one call per workspace. Assert:

```sql
select is(
  (select revision_number from public.record_call_review_revision(
    :'call_a', 0, 'Hovor splnil očekávání', 'Operátor správně ověřil adresu.', null
  )),
  1,
  'first review creates revision 1'
);

select is(
  (select revision_number from public.record_call_review_revision(
    :'call_a', 1, 'Potřebuje opravu', 'Chybělo shrnutí objednávky.', 'Upřesnění po druhé kontrole'
  )),
  2,
  'correction appends revision 2'
);

select is((select count(*)::integer from public.call_review_revisions where call_id = :'call_a'), 2,
  'both revisions remain stored');
```

Also assert exact previous/new JSON in the two `audit_logs.details` values, rejection of revision 2 without a correction reason, rejection of stale `p_expected_revision`, and database errors for direct `UPDATE` and `DELETE`.

- [ ] **Step 2: Write failing pgTAP authorization tests**

Use `set local role authenticated` plus test JWT claims. Assert:

```sql
select lives_ok(
  $$ select public.record_call_review_revision(
       current_setting('test.call_a')::uuid, 0, 'Zkontrolováno', 'Manažerská poznámka.', null
     ) $$,
  'team leader can review a call in the same workspace'
);

select throws_ok(
  $$ select public.record_call_review_revision(
       current_setting('test.call_b')::uuid, 0, 'Cizí hovor', 'Toto nesmí projít.', null
     ) $$,
  '42501',
  null,
  'team leader cannot review another workspace'
);
```

Repeat the positive case for administrator and negative read/write cases for operator and anonymous access.

- [ ] **Step 3: Run the database tests and verify RED**

Run: `npx supabase test db supabase/tests/database/call_review_revisions_test.sql supabase/tests/database/call_review_revisions_rls_test.sql`

Expected: FAIL because the table and RPC do not exist.

- [ ] **Step 4: Create the migration through the CLI**

Run: `npx supabase migration new team_leader_real_call_review`

Store the printed path in a PowerShell variable named `$reviewMigrationPath`; all SQL edits in Tasks 2 and 3 target that generated file.

- [ ] **Step 5: Implement the review schema and validation**

The generated migration must create the table with these core constraints:

```sql
create table public.call_review_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  call_id uuid not null references public.calls(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  verdict text not null check (char_length(btrim(verdict)) between 1 and 200),
  coaching_note text not null check (char_length(btrim(coaching_note)) between 3 and 4000),
  correction_reason text,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  supersedes_revision_id uuid references public.call_review_revisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (call_id, revision_number),
  check (
    (revision_number = 1 and correction_reason is null and supersedes_revision_id is null)
    or
    (revision_number > 1 and char_length(btrim(correction_reason)) between 3 and 1000 and supersedes_revision_id is not null)
  )
);
```

Enable RLS, grant `SELECT, INSERT` to `authenticated`, revoke `UPDATE, DELETE` from `anon, authenticated`, and create manager/workspace policies using the repository's authoritative membership tables and `auth.uid()`. Add a `BEFORE INSERT` trigger that derives `workspace_id` from the call, sets `reviewer_id = auth.uid()`, validates the next revision and direct predecessor, and rejects stale inserts. Add an `AFTER INSERT` trigger that inserts exact JSON before/new state into `audit_logs.details` in the same transaction.

Create `record_call_review_revision` as `SECURITY INVOKER`, set an empty safe search path, schema-qualify every object, take a transaction-scoped advisory lock derived from `p_call_id`, and insert only after validating `p_expected_revision`. Revoke function execution from `PUBLIC` and `anon`; grant it to `authenticated`.

- [ ] **Step 6: Verify GREEN and regenerate TypeScript database types**

Run:

```powershell
npx supabase db reset
npx supabase test db supabase/tests/database/call_review_revisions_test.sql supabase/tests/database/call_review_revisions_rls_test.sql
npx supabase gen types typescript --local | Set-Content -Encoding utf8 src/lib/supabase/types.ts
npm run typecheck
```

Expected: database tests and TypeScript checks PASS.

- [ ] **Step 7: Commit the green schema slice**

```powershell
git add supabase/migrations supabase/tests/database/call_review_revisions_test.sql supabase/tests/database/call_review_revisions_rls_test.sql src/lib/supabase/types.ts
git commit -m "feat: store immutable call review revisions"
```

### Task 3: Capture the exact script and link the completed call

**Files:**
- Modify: the migration generated in Task 2
- Extend: `supabase/tests/database/call_review_revisions_test.sql`
- Create: `tests/call-script-snapshot.test.ts`
- Modify: `src/lib/dal/productScripts.ts`
- Modify: `src/lib/dal/telephonySessions.ts`
- Modify: `src/lib/dal/callCompletion.ts`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `ScriptSnapshotDTO`
- Produces: `resolveCallScriptSnapshot(productId, workspaceId): Promise<ScriptSnapshotDTO>`
- Extends: `createTelephonySession(input)` with `productId: string | null`
- Extends session result with `scriptSnapshot`
- Produces exact link: `telephony_call_sessions.completed_call_id`

- [ ] **Step 1: Write failing snapshot resolver tests**

```ts
it("captures the published version and exact html", async () => {
  const snapshot = await resolveCallScriptSnapshot("product-a", "workspace-a");
  expect(snapshot).toMatchObject({
    source: "published_version",
    productId: "product-a",
    versionId: "version-7",
    versionNumber: 7,
    html: "<p>Approved v7</p>",
  });
});

it("captures the exact built-in fallback when no version is published", async () => {
  const snapshot = await resolveCallScriptSnapshot("product-a", "workspace-a");
  expect(snapshot.source).toBe("built_in_fallback");
  expect(snapshot.html).toBe(buildDefaultScriptHtml(product));
});

it("rejects a product from another workspace", async () => {
  await expect(resolveCallScriptSnapshot("foreign-product", "workspace-a"))
    .rejects.toMatchObject({ code: "NOT_FOUND" });
});
```

- [ ] **Step 2: Add failing database assertions for script immutability and call linkage**

Assert that legacy session columns remain null, valid source/field combinations satisfy check constraints, invalid combinations fail, one call can link to at most one session, and the completion RPC writes `completed_call_id` for both queue and non-queue completion paths without changing snapshot columns on retry.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
npm test -- tests/call-script-snapshot.test.ts
npx supabase test db supabase/tests/database/call_review_revisions_test.sql
```

Expected: FAIL because the resolver and session columns do not exist.

- [ ] **Step 4: Extend the migration with session snapshot columns**

Add nullable legacy-safe columns:

```sql
alter table public.telephony_call_sessions
  add column completed_call_id uuid references public.calls(id) on delete restrict,
  add column script_source text,
  add column script_product_id uuid references public.products(id) on delete restrict,
  add column script_product_title text,
  add column script_version_id uuid references public.product_script_versions(id) on delete restrict,
  add column script_version_number integer,
  add column script_snapshot_html text,
  add column script_captured_at timestamptz;

create unique index telephony_call_sessions_completed_call_id_key
  on public.telephony_call_sessions(completed_call_id)
  where completed_call_id is not null;
```

Add a check constraint for the four accepted states: all snapshot fields null for legacy rows; complete published-version fields; fallback content without version identifiers; or captured `unavailable` without content. Replace the existing call-completion RPC definitions in the new migration so their successful branches set `completed_call_id` on the matching server-owned session.

- [ ] **Step 5: Implement server-side snapshot resolution**

```ts
export type ScriptSnapshotDTO =
  | { source: "published_version"; productId: string; productTitle: string; versionId: string; versionNumber: number; html: string; capturedAt: string }
  | { source: "built_in_fallback"; productId: string; productTitle: string; versionId: null; versionNumber: null; html: string; capturedAt: string }
  | { source: "unavailable"; productId: null; productTitle: null; versionId: null; versionNumber: null; html: null; capturedAt: string };
```

Query the product in the requested workspace. Query the one published `product_script_versions` row. Sanitize persisted HTML with the existing script validator. Build fallback HTML on the server only when the product is valid and no published version exists. Pass the resulting fields into the existing server-owned session insert.

- [ ] **Step 6: Verify GREEN and regenerate types**

Run:

```powershell
npx supabase db reset
npx supabase test db supabase/tests/database/call_review_revisions_test.sql supabase/tests/database/call_review_revisions_rls_test.sql
npm test -- tests/call-script-snapshot.test.ts
npx supabase gen types typescript --local | Set-Content -Encoding utf8 src/lib/supabase/types.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Amend the schema commit while it is still the same independently reviewed slice**

```powershell
git add supabase/migrations supabase/tests/database/call_review_revisions_test.sql src/lib/dal/productScripts.ts src/lib/dal/telephonySessions.ts src/lib/dal/callCompletion.ts src/lib/supabase/types.ts tests/call-script-snapshot.test.ts
git commit -m "feat: capture call script snapshots"
```

### Task 4: Make every telephony adapter display the stored snapshot

**Files:**
- Modify: `src/app/api/telephony/simulation/session/route.ts`
- Modify: `src/app/api/telephony/local/session/route.ts`
- Modify: `src/app/api/telephony/telnyx/session/route.ts`
- Modify: `src/lib/telephony/softphone.ts`
- Modify: `src/app/workspace/page.tsx`
- Modify: `src/components/workspace/ProductScriptPanel.tsx`
- Modify: `tests/telephony-route-authorization.test.ts`
- Modify: `tests/telephony-adapter-route.test.ts`
- Modify: `tests/call-start-timeout.test.ts`
- Modify: `tests/product-script-sections.test.ts`

**Interfaces:**
- Session request adds: `productId: string | null`
- Session response adds: `scriptSnapshot: ScriptSnapshotDTO`
- `ProductScriptPanel` adds prop: `activeSnapshot?: ScriptSnapshotDTO | null`

- [ ] **Step 1: Write failing adapter and panel tests**

For each adapter, assert the route forwards the selected product ID to `createTelephonySession` and returns the server snapshot. Add a component contract test asserting that an active snapshot overrides a newly fetched current script:

```ts
expect(rendered).toContain("Approved v7 used for this call");
expect(rendered).not.toContain("Newly published v8");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/telephony-route-authorization.test.ts tests/telephony-adapter-route.test.ts tests/call-start-timeout.test.ts tests/product-script-sections.test.ts`

Expected: FAIL on missing `productId`, `scriptSnapshot`, or active-snapshot rendering.

- [ ] **Step 3: Thread the product ID and snapshot through the shared call state**

Update the softphone request shape:

```ts
body: JSON.stringify({
  leadId: input.leadId,
  queueItemId: input.queueItemId,
  toNumber: input.toNumber,
  productId: input.productId,
})
```

Store the returned `scriptSnapshot` in the active `CallSession`. Pass it to `ProductScriptPanel`, which displays snapshot HTML during the active session and uses the existing current-script loading behavior only before a session exists.

- [ ] **Step 4: Verify GREEN**

Run the four focused test files from Step 2, then run `npm run typecheck`.

Expected: PASS.

- [ ] **Step 5: Commit the green adapter slice**

```powershell
git add src/app/api/telephony src/lib/telephony/softphone.ts src/app/workspace/page.tsx src/components/workspace/ProductScriptPanel.tsx tests
git commit -m "feat: show the captured script during calls"
```

### Task 5: Add the manager-only review read/write boundary

**Files:**
- Create: `src/lib/dal/callReviews.ts`
- Create: `src/app/actions/callReviews.ts`
- Create: `tests/call-reviews-dal.test.ts`
- Create: `tests/call-review-actions.test.ts`

**Interfaces:**
- Produces: `getCallReview(callId: string): Promise<CallReviewDTO>`
- Produces: `recordCallReview(input: RecordCallReviewInput): Promise<CallReviewRevisionDTO>`
- Produces action: `getCallReviewAction(callId)`
- Produces action: `recordCallReviewAction(input)`

- [ ] **Step 1: Write failing DAL contract tests**

```ts
it("checks the manager role before querying call evidence", async () => {
  await expect(getCallReview("call-a")).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(createDataClient).not.toHaveBeenCalled();
});

it("returns legacy script and source states without guessing", async () => {
  const review = await getCallReview("call-a");
  expect(review.script).toEqual({ kind: "not_recorded" });
  expect(review.callSource).toBe("not_recorded");
});
```

Add tests for same-workspace filtering, structured/plain/unavailable transcripts, ordered revisions, required correction reason, expected revision forwarding, and database conflict mapping.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/call-reviews-dal.test.ts tests/call-review-actions.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement focused DTOs and DAL functions**

`CallReviewDTO` must contain only the evidence the screen renders:

```ts
export interface CallReviewDTO {
  call: { id: string; createdAt: string; durationSeconds: number; outcome: string | null; failReason: string | null; operatorNote: string | null; callbackScheduledAt: string | null };
  customer: { id: string; name: string } | null;
  operator: { id: string; name: string };
  callSource: "telnyx" | "local_sip" | "simulation" | "not_recorded";
  transcript: CallTranscript;
  script: CallReviewScriptEvidence;
  revisions: CallReviewRevisionDTO[];
}
```

Both functions call `requireWorkspaceRole(["team_leader", "administrator"])` before database access. `getCallReview` filters the call by `workspace_id`; `recordCallReview` validates all lengths and invokes `record_call_review_revision` with the exact expected revision.

- [ ] **Step 4: Implement thin server actions**

```ts
"use server";

export async function getCallReviewAction(callId: string) {
  return getCallReview(callId);
}

export async function recordCallReviewAction(input: RecordCallReviewInput) {
  const result = await recordCallReview(input);
  revalidatePath(`/calls/${input.callId}/review`);
  revalidatePath("/exceptions");
  revalidatePath("/audit");
  return result;
}
```

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- tests/call-reviews-dal.test.ts tests/call-review-actions.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the green boundary slice**

```powershell
git add src/lib/dal/callReviews.ts src/app/actions/callReviews.ts tests/call-reviews-dal.test.ts tests/call-review-actions.test.ts
git commit -m "feat: add manager call review boundary"
```

### Task 6: Build the real-call review detail and correction history

**Files:**
- Create: `src/app/calls/[callId]/review/page.tsx`
- Create: `src/components/calls/CallReviewWorkspace.tsx`
- Create: `tests/call-review-page.test.ts`
- Create: `tests/call-review-ui.test.ts`
- Modify: `tests/role-aware-page-authorization.test.ts`

**Interfaces:**
- Consumes: `getCallReview(callId)` from Task 5
- Consumes: `recordCallReviewAction(input)` from Task 5
- Produces route: `/calls/[callId]/review`

- [ ] **Step 1: Write failing page authorization tests**

Assert that the server page requires Team Leader/admin before loading data, renders a truthful not-found state, and does not call the DAL for an operator.

```ts
expect(source).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
expect(source).toContain("getCallReview");
```

- [ ] **Step 2: Write failing UI behavior tests**

Render fixtures for:

- a legacy call with `script.kind === "not_recorded"`;
- a published-version snapshot;
- a built-in fallback snapshot;
- structured, plain-text, and unavailable transcripts;
- no review, revision 1, and revision 2 with history.

Assert exact truthful labels and that correction mode requires `correctionReason` while initial review does not show that field.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- tests/call-review-page.test.ts tests/call-review-ui.test.ts tests/role-aware-page-authorization.test.ts`

Expected: FAIL because the page and component do not exist.

- [ ] **Step 4: Implement the server page**

```tsx
export default async function CallReviewPage({ params }: { params: Promise<{ callId: string }> }) {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const { callId } = await params;
  const review = await getCallReview(callId);
  return <CallReviewWorkspace initialReview={review} />;
}
```

Map `NOT_FOUND` to `notFound()` without exposing cross-workspace details.

- [ ] **Step 5: Implement the client workspace**

Render six compact sections: call facts, outcome/operator note, transcript, script evidence, current human review form, and revision timeline. The correction button pre-fills current verdict/coaching, shows the required correction reason, and sends `expectedRevision = latest.revisionNumber`. On a conflict, preserve form text and show a reload instruction. Disable duplicate submission while the action is pending.

- [ ] **Step 6: Verify GREEN and accessibility basics**

Run:

```powershell
npm test -- tests/call-review-page.test.ts tests/call-review-ui.test.ts tests/role-aware-page-authorization.test.ts
npm run typecheck
```

Expected: PASS; labels are associated with inputs and status messages use an appropriate live region.

- [ ] **Step 7: Commit the green UI slice**

```powershell
git add src/app/calls src/components/calls/CallReviewWorkspace.tsx tests/call-review-page.test.ts tests/call-review-ui.test.ts tests/role-aware-page-authorization.test.ts
git commit -m "feat: add real call review workspace"
```

### Task 7: Connect Calls and Exception Queue without historical guessing

**Files:**
- Modify: `src/lib/dal/exceptionQueue.ts`
- Modify: `src/components/exceptions/ExceptionQueue.tsx`
- Modify: `src/app/calls/page.tsx`
- Modify: `src/components/calls/CallDetailDrawer.tsx`
- Modify: `tests/exception-queue-contract.test.ts`
- Modify: `tests/exception-queue-ui.test.ts`
- Create: `tests/call-review-entry.test.ts`

**Interfaces:**
- Extends `ExceptionQueueItemDTO` with `callReview: { kind: "linked"; callId: string; href: string } | { kind: "not_recorded" } | null`
- Extends `CallDetailDrawerProps` with manager-safe review link data supplied by the server boundary, not a client-guessed role.

- [ ] **Step 1: Write failing Exception Queue link tests**

```ts
it("links outcome recovery only through queue item session and completed call", () => {
  expect(item.callReview).toEqual({
    kind: "linked",
    callId: "call-a",
    href: "/calls/call-a/review",
  });
});

it("does not pick the latest lead call when the exact link is absent", () => {
  expect(item.callReview).toEqual({ kind: "not_recorded" });
});
```

- [ ] **Step 2: Write failing Calls entry authorization tests**

Assert that Team Leader/admin receive a review URL for the selected call and the operator does not receive or render it.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- tests/exception-queue-contract.test.ts tests/exception-queue-ui.test.ts tests/call-review-entry.test.ts`

Expected: FAIL on the missing exact link model.

- [ ] **Step 4: Load exact links in the Exception Queue DAL**

For only `lead_queue_items` queue exceptions, query `telephony_call_sessions` by the queue item IDs and use `completed_call_id` when non-null. Do not query `calls` by lead ID or timestamp. Return `not_recorded` when no exact chain exists.

- [ ] **Step 5: Add manager entry links**

Render „Open call review“ for linked Exception Queue items and a muted „Exact call was not recorded for this exception“ message otherwise. Add the same review link to the existing call detail only when the server-provided role is Team Leader/admin.

- [ ] **Step 6: Verify GREEN**

Run the three focused tests and `npm run typecheck`.

Expected: PASS.

- [ ] **Step 7: Commit the green navigation slice**

```powershell
git add src/lib/dal/exceptionQueue.ts src/components/exceptions/ExceptionQueue.tsx src/app/calls/page.tsx src/components/calls/CallDetailDrawer.tsx tests/exception-queue-contract.test.ts tests/exception-queue-ui.test.ts tests/call-review-entry.test.ts
git commit -m "feat: link managers to exact call reviews"
```

### Task 8: Show complete call-review changes in Audit

**Files:**
- Modify: `src/lib/audit.ts`
- Modify: `src/lib/dal/audit.ts`
- Modify: `src/app/audit/page.tsx`
- Create: `tests/call-review-audit-ui.test.ts`

**Interfaces:**
- Adds known action labels for `CALL_REVIEW_COMPLETED` and `CALL_REVIEW_CORRECTED`
- Produces an expandable call-review audit detail that renders exact old/new values from `details`

- [ ] **Step 1: Write failing audit rendering tests**

```ts
expect(rendered).toContain("Call review corrected");
expect(rendered).toContain("Původní coaching");
expect(rendered).toContain("Opravený coaching");
expect(rendered).toContain("Upřesnění po druhé kontrole");
```

Also assert malformed legacy `details` remains visible as plain text instead of breaking the page.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/call-review-audit-ui.test.ts`

Expected: FAIL because review actions and structured details are not rendered.

- [ ] **Step 3: Implement narrow review-audit parsing and disclosure**

Add a type guard for the exact review audit JSON. Render before/new verdict, coaching, reviewer, revision, and correction reason inside an accessible `<details>` block. Keep all other audit event rendering unchanged.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/call-review-audit-ui.test.ts tests/atomic-business-audit.test.ts`, followed by `npm run typecheck`.

Expected: PASS.

- [ ] **Step 5: Commit the green audit slice**

```powershell
git add src/lib/audit.ts src/lib/dal/audit.ts src/app/audit/page.tsx tests/call-review-audit-ui.test.ts
git commit -m "feat: expose call review audit history"
```

### Task 9: Verify the complete story and update truthful documentation

**Files:**
- Modify: `PROJECT.md`
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Create: `docs/superpowers/reports/2026-09-07-team-leader-real-call-review-verification.md`
- Modify only if behavior changed during verification: focused source/test files from Tasks 1–8

**Interfaces:**
- Produces: repeatable verification evidence for the finished slice

- [ ] **Step 1: Run every automated gate**

```powershell
npx supabase db reset
npx supabase test db
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all commands PASS with no ignored failing tests.

- [ ] **Step 2: Run Supabase advisors against the verified schema**

Discover the installed command shape first:

```powershell
npx supabase db --help
npx supabase db advisors --help
```

Run the supported local advisor form. If the installed CLI does not support it locally, use the Supabase advisor connector against the linked sandbox after applying the reviewed migration. Resolve every new security finding caused by this slice and document unrelated pre-existing findings separately.

- [ ] **Step 3: Verify the manager and operator browser stories**

Run the app and verify:

1. Team Leader opens a persisted call from Calls and saves revision 1.
2. Reload shows revision 1 from the database.
3. Team Leader corrects it and sees both revisions.
4. The audit page shows exact before/new content.
5. An old call shows the script-version-not-recorded state.
6. A future local/simulation test session shows the captured source and snapshot truthfully.
7. An Exception Queue item without an exact session link does not guess a call.
8. Operator cannot open the review URL or invoke the write action.
9. Administrator can complete the same flow.

- [ ] **Step 4: Apply and verify the clean migration in the linked sandbox**

Confirm the project ref is the expected sandbox, compare migration history, apply only the new reviewed migration through the repository's established Supabase workflow, then perform authenticated read-back for manager/operator/cross-workspace behavior. Do not apply to production in this task.

- [ ] **Step 5: Write the verification report and update project status**

The report records commit hashes, exact commands/results, roles exercised, call IDs used, script evidence states, audit read-back, sandbox project ref, migration version, advisor results, and any truthfully unverified external Telnyx behavior. Update project docs to mark only the verified real-call review slice complete.

- [ ] **Step 6: Re-run final gates after documentation or verification fixes**

Run: `npm test && npm run lint && npm run typecheck && npm run build && git diff --check`

Expected: PASS.

- [ ] **Step 7: Commit the verified completion**

```powershell
git add PROJECT.md docs/AKTUALNI_STAV_A_DESATERO.md docs/superpowers/reports/2026-09-07-team-leader-real-call-review-verification.md
git add src tests supabase
git commit -m "docs: verify real call team leader review"
```

## Completion Definition

The branch is ready to integrate only when every checkbox is complete, the full application and database suites are green, the linked sandbox confirms role boundaries and persisted history, no historical script/call relationship is inferred, and the verification report names anything that remains unavailable rather than presenting it as finished.
