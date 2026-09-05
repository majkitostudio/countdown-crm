# Local Telephony Settings and SIP Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat workspace-scoped volbu telefonního adapteru, admin-only `/telephony` a lokální Asterisk/SIP integrační cestu bez rozbití simulace nebo Telnyx foundation.

**Architecture:** Aktivní adapter bude uložený v nové workspace-scoped tabulce a čtený přes serverovou DAL. Admin Settings bude jediná plocha pro změnu adapteru; `/telephony` bude serverově chráněná administrační konzole. Společný call-session/lifecycle kontrakt bude obsluhovat `simulation`, `local_sip` a později `telnyx`, zatímco Asterisk v Dockeru poskytne dvě lokální WebRTC/SIP linky.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase PostgreSQL/RLS, Server Actions, Vitest, SIP.js `0.21.2` pro browserový SIP/WebRTC klient, pinned community image `andrius/asterisk:22.10.1_debian-trixie`, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-05-local-telephony-settings-design.md`

## Global Constraints

- Aktivní adapter je workspace konfigurace; `localStorage` smí obsahovat pouze osobní preference, nikdy zdroj pravdy pro telefonii.
- Hodnoty jsou `simulation`, `local_sip` a `telnyx`; bez uložené volby zůstává bezpečný fallback `simulation`.
- `telnyx` je v UI viditelný, ale blokovaný; server musí aktivaci odmítnout beze změny konfigurace.
- `/telephony` používá `requireWorkspaceRole(["administrator"])`; skrytí odkazu není bezpečnostní hranice.
- Žádný secret, SIP password, token ani credential se nesmí dostat do browseru, diagnostiky, auditu nebo commitu.
- Lokální Asterisk nemá SIP trunk ani veřejný PSTN routing a není veřejně vystavený.
- Každá behaviorální změna začíná failing testem a končí cíleným testem plus repo kontrolami.
- Migraci vytvořit přes `supabase migration new local_telephony_adapter`; název souboru se nevymýšlí ručně.
- Po databázové změně ověřit migration history, schema diff, RLS a autentizovaný read-back.
- Existující Telnyx route, fallback simulation a post-call completion nesmí změnit význam.

## File Map

**Create:**

- migration file returned by `supabase migration new local_telephony_adapter` — settings, provider values, generic provider call ID and RLS/indexes,
- `src/lib/telephony/telephonyAdapter.ts` — adapter types, labels and blocked-provider rules,
- `src/lib/dal/telephonySettings.ts` — server-only workspace settings read/update,
- `src/app/actions/telephonySettings.ts` — authenticated Server Actions,
- `src/components/settings/TelephonyAdapterSettings.tsx` — settings section and links,
- `src/app/telephony/page.tsx` — administrator-only server route,
- `src/components/telephony/TelephonyAdminPanel.tsx` — status, extensions, test call and event UI,
- `src/lib/dal/telephonySessions.ts` — shared session creation and monotonic transitions,
- `src/lib/dal/telephonyEvents.ts` — workspace-scoped safe event read model for the admin console,
- `src/lib/telephony/localSipAdapter.ts` — SIP.js-backed browser adapter,
- `src/lib/telephony/localSipServer.ts` — server-only runtime credential lease,
- `src/app/api/telephony/local/status/route.ts` — safe Asterisk health response,
- `src/app/api/telephony/local/bootstrap/route.ts` — authenticated no-store SIP bootstrap,
- `src/app/api/telephony/adapter/route.ts` — authenticated no-store active-adapter response,
- `src/lib/telephony/telephonyAdapterClient.ts` — client-side adapter response validation,
- `src/app/api/telephony/local/session/route.ts` — local session/event synchronization,
- `docker-compose.telephony.yml` — local-only Asterisk service,
- `docker/asterisk/pjsip.conf`, `extensions.conf`, `http.conf`, `ari.conf`, `rtp.conf` — local PBX configuration,
- `tests/telephony-settings-contract.test.ts`, `tests/telephony-settings-action.test.ts`, `tests/telephony-route-authorization.test.ts`, `tests/local-sip-session-contract.test.ts`, `tests/local-sip-docker-contract.test.ts`, `tests/local-sip-webrtc-lifecycle.test.ts`, `tests/local-sip-ui-contract.test.ts`, `tests/telephony-admin-panel-contract.test.ts` — focused contracts.

**Modify:**

- `src/lib/supabase/types.ts` — new table and `provider_call_id` types,
- `src/lib/telephony/telnyxLifecycle.ts`, `src/lib/telephony/sessionTransitions.ts` — shared lifecycle boundary,
- `src/app/api/telephony/telnyx/session/route.ts`, `src/app/api/telephony/telnyx/webhook/route.ts` — delegate to shared persistence,
- `src/lib/telephony/softphone.ts` — select simulation/local SIP/Telnyx,
- `src/app/settings/page.tsx` — render admin Telephony section,
- `src/components/workspace/CallStatusBar.tsx`, `src/components/workspace/OperatorCallControls.tsx` — truthful Local SIP label and controls,
- `.gitignore` — local SIP secrets/certificates only,
- `docs/TELEPHONY_TELNYX_SETUP.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/README.md` — evidence and links.

---

### Task 1: Add workspace telephony settings schema

**Files:** migration created by `supabase migration new local_telephony_adapter`, `src/lib/supabase/types.ts`, `tests/telephony-settings-contract.test.ts`

**Produces:** `public.workspace_telephony_settings` with one row per workspace; `active_adapter` check for `simulation | local_sip | telnyx`; `updated_by`, timestamps, RLS; nullable `provider_call_id` on sessions with a partial unique `(provider, provider_call_id)` index.

- [x] **Step 1: Discover and create the migration**

Run `supabase migration new --help`, then `supabase migration new local_telephony_adapter`. Use the generated file path in all later commands.

- [x] **Step 2: Write the failing schema test**

Assert the migration source contains the new table, default `simulation`, allowed values, workspace key, RLS, administrator update boundary, `provider_call_id` and its partial unique index. Run `npm test -- tests/telephony-settings-contract.test.ts`; it must fail because the migration is empty.

- [x] **Step 3: Implement the migration and types**

Create the table, policies and index. Preserve existing Telnyx columns and rows. Add matching generated/manual types without weakening existing types.

- [x] **Step 4: Run focused and database checks**

Run `npm test -- tests/telephony-settings-contract.test.ts`, `supabase db reset`, `supabase migration list --local` and `supabase db diff --local`. Expected: focused test passes, migration applies once and post-reset schema diff is empty.

- [x] **Step 5: Commit**

Commit migration, types and test as `feat: add workspace telephony adapter settings`.

---

### Task 2: Implement the server-backed adapter boundary

**Files:** `src/lib/telephony/telephonyAdapter.ts`, `src/lib/dal/telephonySettings.ts`, `src/app/actions/telephonySettings.ts`, `tests/telephony-settings-action.test.ts`

**Interfaces:**

```ts
type TelephonyAdapter = "simulation" | "local_sip" | "telnyx";
type SelectableTelephonyAdapter = "local_sip" | "telnyx";
getWorkspaceTelephonySettings(): Promise<WorkspaceTelephonySettings>;
updateWorkspaceTelephonyAdapter(adapter: SelectableTelephonyAdapter): Promise<WorkspaceTelephonySettings>;
getActiveTelephonyAdapter(): Promise<TelephonyAdapter>;
```

- [x] **Step 1: Write failing tests**

Cover missing row → `simulation`, valid `local_sip`, invalid value, non-admin update, cross-workspace access, blocked `telnyx` and unchanged setting after blocked request. Run `npm test -- tests/telephony-settings-action.test.ts`; verify expected RED.

- [x] **Step 2: Implement pure adapter rules**

Keep types, labels and blocked Telnyx decision independent of Supabase access. Treat `simulation` as fallback, not a normal selectable UI option.

- [x] **Step 3: Implement DAL and actions**

Derive workspace from `requireWorkspaceContext`; require `administrator` for writes; align RLS with the existing `private.is_workspace_admin` helper; use existing audit DAL; never accept a trusted workspace ID from the browser. Return a DTO with workspace, active adapter, updater and timestamp.

- [x] **Step 4: Run focused tests and commit**

Run the focused test and commit as `feat: add server-backed telephony adapter boundary`.

---

### Task 3: Add Admin Settings section and deep links

**Files:** `src/components/settings/TelephonyAdapterSettings.tsx`, `src/app/settings/page.tsx`, `tests/local-sip-ui-contract.test.ts`

- [x] **Step 1: Write failing UI tests**

Assert `id="telephony-adapter"`, Local SIP selectable, Telnyx visible but disabled with blocker copy, Local SIP shows `href="/telephony"`, inactive page link target is `/settings#telephony-adapter`, and no adapter field is added to `UserSettings` or its localStorage payload. Run focused test and verify RED.

- [x] **Step 2: Implement the component**

Use the existing settings visual language. Load the server DTO and call the Server Action for Local SIP. Keep ringtone preferences local and separate. Render the section only for an administrator, while relying on server authorization for safety.

- [x] **Step 3: Verify and commit**

Run `npm test -- tests/local-sip-ui-contract.test.ts`; commit as `feat: add admin telephony adapter settings`.

---

### Task 4: Add admin-only `/telephony` and safe status

**Files:** `src/app/telephony/page.tsx`, `src/components/telephony/TelephonyAdminPanel.tsx`, `src/app/api/telephony/local/status/route.ts`, `tests/telephony-route-authorization.test.ts`

**Produces:** administrator-only page and safe `LocalTelephonyStatus` DTO with active adapter, Asterisk status, extensions `1001`/`1002` and local-only boundaries.

- [x] **Step 1: Write failing authorization tests**

Cover administrator access, operator/team leader denial, direct URL denial, simulation state, inactive Local SIP state and exact deep link back to Settings. Run focused test and verify RED.

- [x] **Step 2: Implement server guard and status endpoint**

Make the page a server component using `requireWorkspaceRole(["administrator"])`. Health-check only the local Asterisk status endpoint. Return no secrets, raw provider payloads or environment values.

- [x] **Step 3: Implement the first panel**

Render status, extensions, Local only/Public PSTN disabled/Recording disabled/Telnyx blocked boundaries, and inactive/error states. Keep test-call, active-call and event areas explicitly unavailable until their real data path exists.

- [x] **Step 4: Verify and commit**

Run `npm test -- tests/telephony-route-authorization.test.ts`; commit as `feat: add admin telephony page`.

---

### Task 5: Extract shared call-session persistence

**Files:** `src/lib/dal/telephonySessions.ts`, `src/app/api/telephony/local/session/route.ts`, existing Telnyx session/webhook routes and lifecycle files, `tests/local-sip-session-contract.test.ts`

**Interfaces:**

```ts
createTelephonySession({ provider, leadId, queueItemId, toNumber, direction }): Promise<{ sessionId: string; provider: string }>;
transitionTelephonySession({ sessionId, provider, status, providerCallId, providerEventId, occurredAt }): Promise<{ status: TelephonyCallStatus }>;
```

- [x] **Step 1: Write failing lifecycle tests**

Cover local creation, provider ID persistence, initiated → ringing → connected → ended, duplicate event no-op, out-of-order event rejection, terminal protection, workspace/assignment checks and provider failure. Run focused test and verify RED.

- [x] **Step 2: Extract existing Telnyx logic**

Move only shared validation and monotonic transition logic into the DAL. Preserve Telnyx signature verification, response statuses and correlation behavior.

- [x] **Step 3: Add local route**

Require authenticated workspace roles, require active adapter `local_sip`, use `provider_call_id`, and write idempotent local events. Reject direct local requests when simulation or blocked Telnyx is active.

- [x] **Step 4: Run regression and commit**

Run `npm test -- tests/local-sip-session-contract.test.ts tests/telnyx-lifecycle.test.ts tests/telnyx-contract.test.ts`; commit as `feat: share telephony session lifecycle across adapters`.

**Implementation note:** The shared DAL now owns session creation and Local SIP transitions. Telnyx PATCH and webhook handling remain provider-specific for this slice so their existing response semantics and signature-verification boundary stay unchanged.

---

### Task 6: Add local Asterisk Docker configuration

**Files:** `docker-compose.telephony.yml`, `docker/asterisk/pjsip.conf`, `extensions.conf`, `http.conf`, `ari.conf`, `rtp.conf`, `.gitignore`, `tests/local-sip-docker-contract.test.ts`

- [x] **Step 1: Write the failing Docker contract test**

Assert a pinned non-`latest` Asterisk image, service name, endpoints `1001`/`1002`, WebSocket/WebRTC transport, bounded local RTP mapping, local-only bindings, no SIP trunk and no committed secrets. Run focused test and verify RED.

- [x] **Step 2: Add Compose and PJSIP configuration**

Use the exact pinned image `andrius/asterisk:22.10.1_debian-trixie`; do not use `latest` or an unpinned tag. Before relying on it, verify that the image exposes the required PJSIP, HTTP/WebSocket and WebRTC modules. Configure two authenticated WebRTC endpoints, local-only HTTP/WebSocket diagnostics and an internal dialplan that permits only `1001` ↔ `1002`. Keep passwords and certificates in ignored local files.

- [x] **Step 3: Validate the container**

Run `docker compose -f docker-compose.telephony.yml config`, `docker compose -f docker-compose.telephony.yml up -d`, `docker compose -f docker-compose.telephony.yml ps` and `docker compose -f docker-compose.telephony.yml logs --no-color --tail 120 asterisk`. Expected: valid config, running container, WebRTC/PJSIP modules loaded and no public trunk.

- [x] **Step 4: Run test and commit**

Run the focused Docker contract test; commit as `feat: add local asterisk docker service`.

---

### Task 7: Connect browser Local SIP to Operator Console

**Files:** `src/lib/telephony/localSipAdapter.ts`, `package.json`, `package-lock.json`, `src/lib/telephony/softphone.ts`, `src/components/workspace/CallStatusBar.tsx`, `src/components/workspace/OperatorCallControls.tsx`, `tests/local-sip-webrtc-lifecycle.test.ts`

- [x] **Step 1: Pin SIP.js and write failing tests**

Pin `sip.js@0.21.2` in package files. Test readiness before dial, session-before-provider, ringing only after SIP ringing, connected only after answer/media confirmation, ended, failed, mute, hold, DTMF, no simulation audio under `local_sip`, and unchanged simulation/Telnyx fake-client behavior. Run focused test and verify RED.

- [x] **Step 2: Implement the adapter**

Expose `connect`, `register`, `dial`, `hangup`, `toggleMute`, `toggleHold`, `sendDtmf` and `disconnect`. Translate SIP.js notifications to shared statuses and post transitions to the local session route. Never persist SIP credentials.

- [x] **Step 3: Select provider from server configuration**

Load active adapter before dialing: simulation uses existing `audioEngine`, local SIP uses the new adapter, Telnyx keeps its existing path. Remove `isTelnyxEnabled()` as the sole provider selector and keep truthful labels.

- [x] **Step 4: Verify and commit**

Run `npm test -- tests/local-sip-webrtc-lifecycle.test.ts tests/telnyx-webrtc-lifecycle.test.ts`; commit as `feat: connect local sip adapter to operator calls`.

**Implementation note:** SIP.js is pinned, the browser adapter is implemented, the controller selects the provider from the server-backed workspace setting, and the bootstrap route supplies a five-minute no-store runtime lease. The Asterisk account remains local-only and is not persisted in CRM settings or browser storage. Provisional SIP ringing is reported only from 180/183 responses.

---

### Task 8: Complete admin diagnostics and end-to-end verification

**Files:** `src/components/telephony/TelephonyAdminPanel.tsx`, local status/session routes, new event DAL, `tests/telephony-admin-panel-contract.test.ts`, verification report under `docs/superpowers/reports/2026-09-05-local-telephony-verification.md`, current telephony docs.

- [x] **Step 1: Write failing admin-panel tests**

Assert status, extension registration, test call controls, active calls, safe recent events, local-only boundaries, deep link and absence of secrets. Run focused test and verify RED.

- [x] **Step 2: Implement read model and test call**

Return capped workspace-scoped active calls/events without raw payloads. Start only `1001` ↔ `1002` calls through the same Local SIP/session path; disable duplicate submissions.

- [ ] **Step 3: Run focused test and manual browser flow**

Run the focused test. Then as administrator open `/settings#telephony-adapter`, select Local SIP, reload, open `/telephony`, verify Asterisk/links, complete `1001` ↔ `1002`, make an Operator Console local call, finish wrap-up, reload and read back session/events/outcome/audit.

- [ ] **Step 4: Run negative flow**

Verify non-admin route denial, non-admin update denial, foreign workspace denial, blocked Telnyx UI/direct request, local session denial while simulation is active, Asterisk outage → `Unavailable`/`failed`, and duplicate/late events not reopening terminal states.

- [ ] **Step 5: Run full verification**

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`, local Supabase migration/RLS/schema checks and the documented browser/database read-back. Record exact outputs and blockers.

- [x] **Step 6: Update docs and commit**

Mark only evidenced items complete. Keep Telnyx public PSTN, recording, transcription and Gemini blocked/out of scope. Add the verification report and plan link to `docs/README.md`; commit as `docs: record local telephony verification`.

**Implementation note:** The admin read model now returns capped active sessions and safe event summaries without raw payloads, and the internal test-call route is limited to 1001 ↔ 1002. Automated verification and the non-admin browser denial passed. The positive admin/audio flow remains open until an administrator session and a second registered browser SIP endpoint are available. The current Supabase schema diff retry is also blocked by an unrelated Docker port conflict on 54320.

## Final Definition of Done

- Adapter selection is server-backed per workspace and never read from `localStorage`.
- Only an administrator can change the adapter or access `/telephony`.
- Settings has `/settings#telephony-adapter`, blocked Telnyx copy and conditional `/telephony` link.
- Telnyx cannot be activated while externally blocked.
- Asterisk runs locally in Docker with exactly two internal WebRTC/SIP endpoints and no PSTN path.
- Local SIP uses the shared CRM lifecycle and persistence contract.
- Operator Console can run a real local internal call and finish the existing post-call workflow.
- `/telephony` shows safe status, extensions, active calls, recent events and actionable failures.
- Duplicate, late and out-of-order events are safe; terminal sessions cannot reopen.
- Supabase migration/RLS, tests, lint, typecheck, build, browser flow and database read-back have recorded evidence.
- Documentation does not describe the local lab as public or production telephony.
