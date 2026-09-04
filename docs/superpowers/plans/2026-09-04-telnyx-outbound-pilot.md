# Telnyx Outbound Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ověřitelně dokončit outbound Telnyx WebRTC tok pro autentizovaný workspace, včetně pravdivého browser lifecycle, serverové session persistence, podepsaných webhooků a browser → API → DB důkazu.

**Architecture:** Zachováme existující `WebRtcSoftphoneController`, Next.js Route Handlers a server-owned Supabase datovou vrstvu, ale sjednotíme provider-to-CRM stavový kontrakt do čistého telephony modulu. Webhook zůstane autoritativní pro provider lifecycle, zatímco browser synchronizace bude best-effort doplněk; server bude vynucovat vlastnictví session, povolené přechody, workspace scope a terminální stavy.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, `@telnyx/webrtc` 2.27.10, Supabase PostgreSQL/Auth, Vitest, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-04-telnyx-outbound-pilot-design.md`

## Global Constraints

- Žádný Telnyx API klíč, Public Key, WebRTC token, heslo ani osobní telefonní údaj nesmí být v repozitáři, browser bundle nebo diagnostické odpovědi.
- `NEXT_PUBLIC_TELNYX_ENABLED=true` se použije až po ověření čísla, connection, environmentu a veřejného webhooku v cílovém prostředí.
- Žádný browser nebo webhook event nesmí otevřít `ended` nebo `failed` session zpět do aktivního stavu.
- Neznámý provider stav nesmí být považován za úspěch; UI nesmí zobrazit `connected` bez skutečného Telnyx lifecycle signálu.
- Každá session a event zůstává workspace-scoped; queue-bound outbound vyžaduje assignment aktuálního uživatele.
- Fallback softphone zůstává simulací a musí být v UI rozlišitelný od Telnyx live režimu.
- V této fázi se neimplementuje inbound routing, recording, retention, transcription, Gemini ani samostatné admin UI.
- Před předáním musí projít `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` a `git diff --check`.

## File Map

- `src/lib/telephony/telnyxLifecycle.ts` — čistý provider event/state mapping a povolené CRM přechody.
- `src/lib/telephony/softphone.ts` — browser readiness, listener lifecycle, media/provider failure a UI session synchronizace.
- `src/lib/telephony/telnyxServer.ts` — serverová konfigurace a bezpečná Telnyx request hranice.
- `src/app/api/telephony/telnyx/session/route.ts` — workspace-scoped create/update session endpoint.
- `src/app/api/telephony/telnyx/webhook/route.ts` — podpis, korelace, idempotentní event insert a monotónní session update.
- `src/components/workspace/CallStatusBar.tsx` a `src/components/workspace/OperatorCallControls.tsx` — pravdivé live/fallback/failure copy, pouze pokud bude nutná změna UI.
- `tests/telnyx-lifecycle.test.ts` — čistý lifecycle kontrakt.
- `tests/telnyx-session-contract.test.ts` — serverová session transition a authorization hranice.
- `tests/telnyx-webhook-contract.test.ts` — webhook event mapping/idempotence/stale event kontrakt.
- `tests/softphone-lifecycle.test.ts` — browser controller regression a fake Telnyx client.
- `docs/TELEPHONY_TELNYX_SETUP.md` — cílová konfigurace a důkazní runbook bez tajných hodnot.

---

### Task 1: Sjednotit Telnyx lifecycle kontrakt

**Files:**
- Create: `src/lib/telephony/telnyxLifecycle.ts`
- Create: `tests/telnyx-lifecycle.test.ts`
- Modify: `src/lib/telephony/softphone.ts`
- Modify: `src/app/api/telephony/telnyx/session/route.ts`
- Modify: `src/app/api/telephony/telnyx/webhook/route.ts`

**Interfaces:**
- Produces `export type TelephonyCallStatus = "initiated" | "ringing" | "connected" | "held" | "ended" | "failed"`.
- Produces `mapTelnyxCallState(state: string): TelephonyCallStatus | null`.
- Produces `mapTelnyxEventType(eventType: string): TelephonyCallStatus | null`.
- Produces `canTransitionCallStatus(from: TelephonyCallStatus, to: TelephonyCallStatus): boolean`.
- Produces `isTerminalCallStatus(status: TelephonyCallStatus): boolean`.

- [ ] **Step 1: Write the failing lifecycle tests.**

```ts
import { describe, expect, it } from "vitest";
import {
  canTransitionCallStatus,
  isTerminalCallStatus,
  mapTelnyxCallState,
  mapTelnyxEventType,
} from "@/lib/telephony/telnyxLifecycle";

describe("Telnyx lifecycle contract", () => {
  it("maps documented browser states and ignores unknown states", () => {
    expect(mapTelnyxCallState("trying")).toBe("ringing");
    expect(mapTelnyxCallState("requesting")).toBe("ringing");
    expect(mapTelnyxCallState("active")).toBe("connected");
    expect(mapTelnyxCallState("held")).toBe("held");
    expect(mapTelnyxCallState("hangup")).toBe("ended");
    expect(mapTelnyxCallState("provider_success")).toBeNull();
  });

  it("uses the actual Voice API event names", () => {
    expect(mapTelnyxEventType("call.initiated")).toBe("initiated");
    expect(mapTelnyxEventType("call.answered")).toBe("connected");
    expect(mapTelnyxEventType("call.hold")).toBe("held");
    expect(mapTelnyxEventType("call.unhold")).toBe("connected");
    expect(mapTelnyxEventType("call.hangup")).toBe("ended");
  });

  it("keeps terminal states terminal and permits hold/unhold", () => {
    expect(canTransitionCallStatus("connected", "held")).toBe(true);
    expect(canTransitionCallStatus("held", "connected")).toBe(true);
    expect(canTransitionCallStatus("ended", "connected")).toBe(false);
    expect(canTransitionCallStatus("failed", "ringing")).toBe(false);
    expect(isTerminalCallStatus("ended")).toBe(true);
    expect(isTerminalCallStatus("connected")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module is missing.**

Run: `npm test -- tests/telnyx-lifecycle.test.ts`

Expected: FAIL with an import/module error for `@/lib/telephony/telnyxLifecycle`.

- [ ] **Step 3: Implement the smallest pure mapping module.**

Map browser states `trying`, `requesting`, `ringing` to `ringing`; `active` to
`connected`; `held` to `held`; and `hangup`/`done` to `ended`. Map Voice API
events `call.initiated`, `call.answered`, `call.hold`, `call.unhold` and
`call.hangup` exactly. Allow `initiated → ringing|connected|ended|failed`,
`ringing → connected|ended|failed`, `connected → held|ended|failed`,
`held → connected|ended|failed`, and same-state idempotence. Reject all
transitions out of `ended` or `failed`.

- [ ] **Step 4: Replace duplicate route/controller mapping with the module.**

Remove the local `SessionStatus` mapping and the inline provider state mapping
from the three consumers. Keep the existing public `CallState` UI type only as
an alias or compatible type boundary; do not change the fallback simulation's
observable lifecycle.

- [ ] **Step 5: Run the focused test and confirm it passes.**

Run: `npm test -- tests/telnyx-lifecycle.test.ts`

Expected: all lifecycle mapping, hold/unhold and terminal-state tests pass.

- [ ] **Step 6: Commit the self-contained contract change.**

```bash
git add src/lib/telephony/telnyxLifecycle.ts src/lib/telephony/softphone.ts src/app/api/telephony/telnyx/session/route.ts src/app/api/telephony/telnyx/webhook/route.ts tests/telnyx-lifecycle.test.ts
git commit -m "refactor: centralize telnyx call lifecycle"
```

### Task 2: Harden workspace-scoped session persistence

**Files:**
- Create: `src/lib/telephony/sessionTransitions.ts`
- Create: `tests/telnyx-session-contract.test.ts`
- Modify: `src/app/api/telephony/telnyx/session/route.ts`

**Interfaces:**
- Produces `getAllowedPreviousStatuses(next: TelephonyCallStatus): readonly TelephonyCallStatus[]`.
- Produces `isSessionStatus(value: unknown): value is TelephonyCallStatus`.
- The `POST /api/telephony/telnyx/session` response remains `{ sessionId: string; toNumber: string }` on success.
- The `PATCH /api/telephony/telnyx/session` response remains `{ ok: true }` on success and returns `404` for an unavailable session or `409` for a stale/illegal transition.

- [ ] **Step 1: Write failing tests for status validation and ownership boundaries.**

```ts
import { describe, expect, it } from "vitest";
import { getAllowedPreviousStatuses, isSessionStatus } from "@/lib/telephony/sessionTransitions";

describe("telephony session transitions", () => {
  it("accepts only the persisted CRM status values", () => {
    expect(isSessionStatus("connected")).toBe(true);
    expect(isSessionStatus("call.completed")).toBe(false);
    expect(isSessionStatus(undefined)).toBe(false);
  });

  it("does not allow a terminal session to reopen", () => {
    expect(getAllowedPreviousStatuses("connected")).not.toContain("ended");
    expect(getAllowedPreviousStatuses("ringing")).not.toContain("failed");
    expect(getAllowedPreviousStatuses("ended")).toContain("connected");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails.**

Run: `npm test -- tests/telnyx-session-contract.test.ts`

Expected: FAIL because the transition helper is not present.

- [ ] **Step 3: Implement transition validation and conditional updates.**

In `PATCH`, reject a missing or unknown status with `400`. Update by
`sessionId`, `workspace_id`, `operator_id`, and a status filter from
`getAllowedPreviousStatuses(next)`. Request the updated row with
`.select("id,status").maybeSingle()`. Return `404` only when the session is
not visible in the current workspace/owner scope; return `409` when the row
exists but its current status no longer permits the requested transition.
Never use an unscoped admin update.

Keep `POST` lead and queue-item validation unchanged, including workspace and
current-assignment checks. Keep `team_leader` and `administrator` allowed for
their own authenticated workspace calls, but do not broaden queue assignment
ownership to other users.

- [ ] **Step 4: Make timestamps monotonic.**

Set `answered_at` only when entering `connected` from a pre-connected state and
set `ended_at` only when entering `ended` or `failed`. Do not overwrite a
previous timestamp on a duplicate same-state PATCH. Preserve provider IDs only
when a non-empty value is supplied.

- [ ] **Step 5: Run focused and existing authorization tests.**

Run: `npm test -- tests/telnyx-session-contract.test.ts tests/telnyx-contract.test.ts tests/call-order.test.ts`

Expected: all tests pass, with no new permission bypass.

- [ ] **Step 6: Commit the persistence hardening.**

```bash
git add src/lib/telephony/sessionTransitions.ts src/app/api/telephony/telnyx/session/route.ts tests/telnyx-session-contract.test.ts
git commit -m "fix: enforce telnyx session transitions"
```

### Task 3: Make the browser WebRTC lifecycle truthful and deterministic

**Files:**
- Create: `src/lib/telephony/telnyxClientAdapter.ts`
- Modify: `src/lib/telephony/softphone.ts`
- Modify: `tests/softphone-lifecycle.test.ts`

**Interfaces:**
- Produces a testable adapter boundary for `connect`, `newCall`, `telnyx.ready`, `telnyx.error`, `telnyx.warning`, `telnyx.notification` and socket close/error events.
- `WebRtcSoftphoneController.dial(...)` continues to return `Promise<boolean>`.
- A provider readiness or media error moves the current non-terminal CRM session to `failed` and rejects/cancels the dial; it never moves it to `connected`.

- [ ] **Step 1: Add failing fake-client tests.**

Extend `tests/softphone-lifecycle.test.ts` with a fake Telnyx client that
records listeners and exposes `emitReady`, `emitCallUpdate`, and `emitError`.
Assert that `dial` does not call `newCall` before `emitReady`, that two dials
reuse one listener binding, and that an error leaves the controller in a
non-connected terminal/failure path.

- [ ] **Step 2: Run the focused test and confirm it fails against current behavior.**

Run: `npm test -- tests/softphone-lifecycle.test.ts`

Expected: FAIL for readiness ordering, duplicate listener binding, or provider
error handling.

- [ ] **Step 3: Implement a single Telnyx client binding.**

Create the client once per controller, bind SDK listeners once, and wait for
the documented `telnyx.ready` event before creating the outbound call. Use
`telnyx.notification` only for call updates; handle `telnyx.error` and
`telnyx.warning` separately. Treat `callUpdate`'s `call.state` as the source
of call state, not the notification type string.

- [ ] **Step 4: Normalize provider state through Task 1 and preserve correlation.**

Keep `client_state` encoded with the CRM session ID. Capture the Telnyx call
IDs from the SDK call object and sync them once available. On `hangup`, socket
signaling close, unrecoverable error, or media failure, stop the timer, mark
the UI session as ended/failed according to the actual signal, and schedule
the existing reset without allowing a stale callback to alter a new call.

- [ ] **Step 5: Keep fallback behavior explicit.**

Do not call `audioEngine` in live Telnyx mode. Keep simulation-only audio
indicators and copy behind `!isTelnyxEnabled()`. If live mode cannot become
ready, show the existing actionable error surface and leave the call outcome
workflow available only after a real ended/failed state.

- [ ] **Step 6: Run focused lifecycle tests and lint.**

Run: `npm test -- tests/softphone-lifecycle.test.ts tests/telnyx-lifecycle.test.ts`; then `npm run lint`.

Expected: all fake-client, simulation regression and lifecycle tests pass; no
new lint warnings.

- [ ] **Step 7: Commit the browser lifecycle change.**

```bash
git add src/lib/telephony/telnyxClientAdapter.ts src/lib/telephony/softphone.ts tests/softphone-lifecycle.test.ts
git commit -m "fix: make telnyx browser lifecycle authoritative"
```

### Task 4: Make webhook persistence idempotent and order-safe

**Files:**
- Create: `src/lib/telephony/telnyxWebhook.ts`
- Create: `tests/telnyx-webhook-contract.test.ts`
- Modify: `src/app/api/telephony/telnyx/webhook/route.ts`

**Interfaces:**
- Produces `parseTelnyxVoiceEvent(rawBody: string): ParsedTelnyxVoiceEvent | null`.
- Produces `statusForTelnyxEvent(eventType: string): TelephonyCallStatus | null`.
- Produces `isDuplicateProviderEvent(error: { code?: string; message?: string } | null): boolean`.
- The webhook returns `200 { ok: true }` for a valid signature with an unknown event or unknown session correlation, so Telnyx does not retry an event the application intentionally cannot process.
- Invalid signature remains `401`; processing/database failures remain `500` and are retryable.

- [ ] **Step 1: Write failing pure webhook contract tests.**

Cover:

```ts
expect(statusForTelnyxEvent("call.hold")).toBe("held");
expect(statusForTelnyxEvent("call.unhold")).toBe("connected");
expect(statusForTelnyxEvent("call.held")).toBeNull();
expect(isDuplicateProviderEvent({ code: "23505" })).toBe(true);
expect(isDuplicateProviderEvent({ code: "42501" })).toBe(false);
```

Also assert that a signed valid payload with an unknown event type is an
acknowledged no-op and that a malformed JSON body never bypasses signature
verification.

- [ ] **Step 2: Run the focused test and confirm current mapping fails.**

Run: `npm test -- tests/telnyx-webhook-contract.test.ts tests/telnyx-contract.test.ts`

Expected: FAIL because current code uses non-contract `call.held`/`call.unheld`
names and duplicate detection is based on error-message text.

- [ ] **Step 3: Implement parse, mapping and duplicate detection helpers.**

Keep raw-body signature verification before JSON parsing. Validate the minimum
envelope (`data.id`, `data.event_type`, `data.payload`) and preserve the full
provider payload for audit. Detect a Postgres unique violation by code `23505`
and do not classify arbitrary error text as a duplicate.

- [ ] **Step 4: Correlate by client state first and provider IDs second.**

Use the CRM session ID from `client_state` first. If it is absent, match by
`telnyx_call_control_id`; keep unknown correlation as a successful no-op after
signature verification. Store `connection_id`, `call_control_id`,
`call_leg_id`, `call_session_id`, `from`, `to`, `hangup_cause`, and event time
when present, without overwriting existing values with `undefined`.

- [ ] **Step 5: Apply status updates through the transition contract.**

After inserting the event, update only when the current session status permits
the mapped next status. A stale `ringing` after `connected`, or any mapped
state after `ended`/`failed`, is retained in the audit trail but does not
downgrade/reopen the session. A duplicate event may still return `200`, but it
must not update timestamps twice.

- [ ] **Step 6: Add duration read-back data without inventing success.**

On `call.hangup`, derive `duration_seconds` only from valid provider
`start_time` and `end_time` values; otherwise leave the existing value. Never
set `completed` or any CRM business outcome from a webhook alone.

- [ ] **Step 7: Run focused webhook, signature and full tests.**

Run: `npm test -- tests/telnyx-webhook-contract.test.ts tests/telnyx-contract.test.ts tests/softphone-lifecycle.test.ts`; then `npm test`.

Expected: all focused and full test suites pass, including replay/tampering
signature rejection and existing simulation lifecycle coverage.

- [ ] **Step 8: Commit webhook hardening.**

```bash
git add src/lib/telephony/telnyxWebhook.ts src/app/api/telephony/telnyx/webhook/route.ts tests/telnyx-webhook-contract.test.ts
git commit -m "fix: harden telnyx webhook correlation"
```

The current schema already contains the provider IDs, timestamps, status,
duration and JSON payload required by this slice. Add a separately named,
timestamped migration only if implementation and linked-schema inspection
prove that a concrete missing constraint is required; do not add a speculative
migration or stage unrelated migration files.

### Task 5: Harden configuration errors and operator-facing copy

**Files:**
- Modify: `src/lib/telephony/telnyxServer.ts`
- Modify: `src/app/api/telephony/telnyx/token/route.ts`
- Modify: `src/lib/telephony/softphone.ts`
- Modify: `src/components/workspace/CallStatusBar.tsx`
- Modify: `src/components/workspace/OperatorCallControls.tsx` only when the live failure state needs a copy or accessibility correction
- Test: `tests/telnyx-contract.test.ts`, `tests/softphone-lifecycle.test.ts`

**Interfaces:**
- `getTelnyxConfig()` rejects missing API key, connection ID, caller number and invalid/non-E.164 caller number with `TelnyxConfigurationError`.
- API responses never include `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, provider token or full provider response body.
- Live mode displays a Telnyx-specific state only after readiness; fallback displays `Call simulation` and simulation audio only when the flag is off.

- [ ] **Step 1: Add failing tests for configuration safety.**

Mock environment values and assert that missing configuration returns the
existing `503` class of response, an invalid caller number is rejected before
the Telnyx API request, and a provider error response is truncated to a safe
operator message without exposing authorization headers or secrets.

- [ ] **Step 2: Implement validation and safe error normalization.**

Reuse `normalizePhoneNumber`; require that the normalized caller equals the
configured E.164 value. Keep secrets server-only and log only a correlation ID,
HTTP status and short provider-safe reason.

- [ ] **Step 3: Verify truthful live/fallback UI labels.**

Ensure `CallStatusBar` and controls distinguish live Telnyx, simulated audio,
provider readiness failure and ended state. Do not add new controls or make
script reading interactive.

- [ ] **Step 4: Run focused tests and commit.**

Run: `npm test -- tests/telnyx-contract.test.ts tests/softphone-lifecycle.test.ts`.

```bash
git add src/lib/telephony/telnyxServer.ts src/app/api/telephony/telnyx/token/route.ts src/lib/telephony/softphone.ts src/components/workspace/CallStatusBar.tsx src/components/workspace/OperatorCallControls.tsx tests/telnyx-contract.test.ts tests/softphone-lifecycle.test.ts
git commit -m "fix: make telnyx failures explicit"
```

### Task 6: Prepare the real localhost and target-environment verification

**Files:**
- Modify: `docs/TELEPHONY_TELNYX_SETUP.md`
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md` only to record verified evidence or a concrete blocker
- Create: `docs/superpowers/reports/2026-09-04-telnyx-outbound-pilot-verification.md`

**Interfaces:**
- The runbook names the exact environment, account role, lead/queue condition, provider event sequence, database tables and expected read-back fields without recording secrets or personal phone numbers.
- The verification report distinguishes automated proof, browser proof, provider proof and database proof. It may finish as `blocked` when a Telnyx number, public webhook or authenticated target environment is unavailable.

- [ ] **Step 1: Verify Telnyx account prerequisites outside the repository.**

In the Telnyx dashboard, confirm that the test phone number is assigned to the
active voice connection, the connection points to the public webhook URL, the
required call lifecycle events are enabled, and the target environment has
server-only `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`,
`TELNYX_DEFAULT_CALLER_NUMBER`, `TELNYX_PUBLIC_KEY` plus
`NEXT_PUBLIC_TELNYX_ENABLED=true`. Record only pass/fail and non-secret IDs in
the report.

- [ ] **Step 2: Run the application normally on localhost.**

Start with `npm run dev` and open `http://localhost:3000/workspace` using a
real authenticated operator, teamleader or administrator account from the
target workspace. Do not set `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` for this
evidence and do not seed or mutate a demo workspace solely to make the screen
look populated.

- [ ] **Step 3: Execute the authenticated outbound test.**

Use a lead visible in the current workspace and, when it is queue-bound, an
assignment owned by the logged-in user. Record the observed sequence:
`token → session initiated → provider call.initiated → ringing/trying →
answered/connected → optional hold/unhold → hangup → webhook → outcome UI`.
Confirm that the UI never jumps directly from dial to connected.

- [ ] **Step 4: Perform database read-back after reload.**

After the call ends and the outcome is saved, reload the workspace and inspect
the linked Supabase tables using an authenticated or server-owned read path:
one row in `telephony_call_sessions` with the matching workspace, lead,
operator, provider IDs, status and timestamps; one row per unique provider
event in `telephony_call_events`; no duplicate rows after replaying an event.

- [ ] **Step 5: Execute the negative matrix.**

Verify an unauthenticated token/session request (`401`), a crosstenant lead
lookup (`404` or equivalent unavailable response), a queue item assigned to a
different operator (`409`), an invalid signature (`401`), a stale webhook
timestamp (`401`), a duplicate provider event (`200` with one DB row), a
late event after hangup (audit row but no session reopen), and missing Telnyx
configuration (`503` without secrets in response).

- [ ] **Step 6: Update the runbook with evidence and stop if a prerequisite is blocked.**

If the number, public webhook, authenticated workspace or DB read-back is not
available, record the exact blocker and leave the live flag disabled. Do not
call the pilot ready based on unit tests or a simulation.

- [ ] **Step 7: Run the complete repository verification.**

Run: `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`; `git diff --check`.

- [ ] **Step 8: Commit the runbook and verification evidence.**

```bash
git add docs/TELEPHONY_TELNYX_SETUP.md docs/AKTUALNI_STAV_A_DESATERO.md docs/superpowers/reports/2026-09-04-telnyx-outbound-pilot-verification.md
git commit -m "docs: record telnyx outbound pilot verification"
```

### Task 7: Final review and integration

**Files:**
- Review: all files changed by Tasks 1–6
- Test: full repository test/check commands

- [ ] **Step 1: Inspect the complete diff and secret boundary.**

Run: `git log --oneline --decorate -n 10`; `git diff HEAD~1..HEAD --stat`; and
`git diff HEAD~1..HEAD --check` for each implementation commit under review.
Search the changed files for `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `login_token`,
phone numbers and raw provider response logging. Confirm that any matches are
only variable names, redacted examples or test fixtures that contain no real
credential.

- [ ] **Step 2: Run all automated checks from a clean working tree.**

Run: `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`.

Expected: all commands exit successfully and the verification report states
which external checks were actually completed.

- [ ] **Step 3: Request code review before merge/push.**

Review specifically for workspace/RLS bypass, status reopening, duplicate
provider events, listener leaks, misleading live/simulation copy and secrets
in logs or browser responses. Resolve findings before integrating.

- [ ] **Step 4: Push one coherent pilot slice.**

Use the project workflow's current branch only after review and verification.
Push the tested commits and report the exact commit range, browser environment,
database read-back result and any remaining blocker.

## Self-Review

- The plan covers the spec's configuration prerequisite, lifecycle mapping,
  role/workspace boundaries, failure states, idempotency, out-of-order events,
  browser readiness, database read-back and explicit non-goals.
- No task treats the fallback simulator, unit tests or build as proof of live
  Telnyx operation.
- The external number, environment and webhook prerequisites are deliberately
  verification inputs, not invented repository fixtures.
- No inbound, recording, transcript, AI, teamleader queue or admin UI work is
  hidden inside this telephony slice.
