# P1 Call Logs Truthful Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Call Logs describe and label transcript evidence truthfully without implying that every call has a full or real-time transcript.

**Architecture:** Keep the existing `CallRecord.transcript` discriminated union and `CallDetailDrawer` evidence rendering. Change only Call Logs page copy and the row action label: captured structured/plain transcripts use `View transcript`; `unavailable` transcripts use `View call details`. No telephony provider, transcription, Gemini, persistence, or authorization code changes are in scope.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest.

**Spec:** `docs/AKTUALNI_STAV_A_DESATERO.md` (P1.3) plus the Call Logs requirements in the execution request.

## Global Constraints

- Change only `src/app/calls/page.tsx`, a small label helper if truly needed, and focused Call Logs/transcript tests.
- Do not touch Telnyx dependencies, telephony settings, transcript persistence, call-review authorization, or review DAL.
- The page must not claim “full speech transcript”, “real-time transcript”, or equivalent for every call.
- A captured transcript action is exactly `View transcript`.
- A call with `transcript.kind === "unavailable"` uses exactly `View call details`.
- Do not infer transcript availability from a truthy/falsy string or from a count; use the `CallTranscript.kind` discriminant.

---

### Task 1: Add the failing copy/markup contract test

**Files:**
- Create: `tests/call-logs-truthful-copy.test.ts`
- Read-only reference: `src/app/calls/page.tsx`
- Read-only reference: `src/lib/callTranscript.ts`

**Interfaces:**
- Consumes: `CallTranscript` and the `CallRecord.transcript` discriminant used by `CallLogsPage`.
- Produces: a source/markup contract that requires truthful header copy and transcript-aware action labels without changing call data contracts.

- [ ] **Step 1: Write the failing test**

Use the existing source-contract pattern for this page:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/calls/page.tsx"), "utf8");

describe("Call Logs truthful transcript copy", () => {
  it("does not promise a full or real-time transcript for every call", () => {
    expect(source).not.toContain("full speech transcript protocols");
    expect(source).not.toContain("Real-time call history logs");
    expect(source).toContain("captured transcript availability");
  });

  it("labels the row action from the transcript evidence state", () => {
    expect(source).toContain('c.transcript.kind === "unavailable"');
    expect(source).toContain("View call details");
    expect(source).toContain("View transcript");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/call-logs-truthful-copy.test.ts`

Expected: FAIL because the current header contains “Real-time … full speech transcript protocols” and the row always renders `Transcript`.

- [ ] **Step 3: Commit the red contract**

```powershell
git add tests/call-logs-truthful-copy.test.ts
git commit -m "test: require truthful call logs transcript copy"
```

### Task 2: Implement the minimal truthful page copy

**Files:**
- Modify: `src/app/calls/page.tsx` (`PageHeader.description`, row action label)
- Modify: `tests/call-logs-truthful-copy.test.ts`

**Interfaces:**
- Consumes: `CallRecord.transcript: CallTranscript` from `@/lib/calls`.
- Produces: visible labels with the exact mapping `structured|plain_text → View transcript` and `unavailable → View call details`.

- [ ] **Step 1: Add one failing exact-label assertion**

Extend the test to reject the generic label and require the conditional expression to be in the action button:

```ts
expect(source).not.toContain('<span>Transcript</span>');
expect(source).toContain('{c.transcript.kind === "unavailable" ? "View call details" : "View transcript"}');
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `npm test -- tests/call-logs-truthful-copy.test.ts`

Expected: FAIL on the existing generic `<span>Transcript</span>` action.

- [ ] **Step 3: Write the minimal implementation**

Change the header description to a truthful phrase such as `Call history, AHT benchmarks, and captured transcript availability`. In the existing row button, keep the same `selectedCall` behavior and replace only its text with:

```tsx
<span>
  {c.transcript.kind === "unavailable" ? "View call details" : "View transcript"}
</span>
```

Do not change `getCalls`, `CallRecord`, `CallDetailDrawer`, or any telephony/transcription dependency.

- [ ] **Step 4: Run focused, related, and full verification**

Run: `npm test -- tests/call-logs-truthful-copy.test.ts tests/call-transcript.test.ts tests/call-logs-review-status.test.ts tests/calls-fail-contract.test.ts`

Expected: PASS with the existing transcript parsing, failure-state, and manager review contracts unchanged.

- [ ] **Step 5: Commit the implementation**

```powershell
git add src/app/calls/page.tsx tests/call-logs-truthful-copy.test.ts
git commit -m "fix: make call logs transcript copy truthful"
```

### Task 3: Verify the bounded Call Logs slice

**Files:**
- Modify only if required by verification: `src/app/calls/page.tsx`, `tests/call-logs-truthful-copy.test.ts`

**Interfaces:**
- Consumes: the existing `CallTranscript` parser and Call Logs review boundary.
- Produces: fresh local verification evidence and a commit hash for Sol's P1 integration.

- [ ] **Step 1: Inspect the diff for scope violations**

Run: `git diff -- src/app/calls/page.tsx tests/call-logs-truthful-copy.test.ts; git status --short`

Expected: only Call Logs copy/markup and its focused test are changed; no Telnyx, Gemini, telephony settings, transcript model, or review authorization files appear.

- [ ] **Step 2: Run fresh focused and project checks**

Run: `npm test -- tests/call-logs-truthful-copy.test.ts tests/call-transcript.test.ts tests/call-logs-review-status.test.ts tests/calls-fail-contract.test.ts && npm run lint && npm run typecheck && git diff --check`

Expected: exit 0, with focused tests passing and no whitespace errors. Run `npm run build` separately before claiming a build result.

- [ ] **Step 3: Commit only after the fresh checks**

```powershell
git add src/app/calls/page.tsx tests/call-logs-truthful-copy.test.ts
git commit -m "fix: make call logs transcript labels truthful"
```

