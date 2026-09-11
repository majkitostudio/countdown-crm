# Operator Client Profile And Verified Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zjednodušit Operator Console, přidat read-only Klientský profil v nové kartě, focus režim skriptu a bezpečně ověřenou doručovací adresu.

**Architecture:** Adresa je neměnný JSONB snapshot objednávky, ne atribut Leada. Oba atomické objednávkové toky ji validují a uloží; read model ji ukáže jen z nejnovější doručené objednávky. `/leads/[leadId]` se stane Klientským profilem a ponechá assignment guard.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind, Vitest, Supabase/Postgres, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-11-operator-workspace-client-profile-design.md`

## Global Constraints

- Operátor v profilu pouze přidává append-only poznámku; žádný údaj klienta nemění.
- Profil se otevírá s `target="_blank"` a `rel="noopener noreferrer"`; operátor otevře jen aktuální assignment.
- Staré objednávky zůstávají bez adresy. Adresa se nikdy neodvozuje z města, země ani poznámek.
- Ověřená adresa je validní snapshot nejnovější objednávky `status = 'delivered'`; ostatní stavy ji nepotvrdí.
- Adresy zůstávají workspace-scoped; nepřidává se public grant, view ani `SECURITY DEFINER`.
- Compact / Extended zmizí z UI, preference, legacy importu, databázového typu i tabulky.

---

### Task 1: Datový kontrakt adresy a preference

**Files:**
- Create: migration from `npx supabase migration new operator_client_profile_delivery_address`
- Create: `src/lib/deliveryAddress.ts`, `tests/delivery-address.test.ts`, `supabase/tests/database/delivery_address_snapshot_test.sql`
- Modify: `src/lib/supabase/types.ts`, `src/lib/settings.ts`, `src/lib/dal/userPreferences.ts`, `src/hooks/useUserPreferences.ts`
- Modify: `supabase/tests/database/user_preferences_rls_test.sql`, `tests/settings.test.ts`, `tests/user-preferences-contract.test.ts`

**Produces:** nullable `orders.delivery_address_snapshot` and ringtone-only user preferences.

- [ ] **Step 1: Write failing parser, schema, and preference tests.**

```ts
expect(parseDeliveryAddressSnapshot({
  recipient_name: "Jane Doe", line1: "Main 1", city: "Prague",
  postal_code: "110 00", country: "CZ",
})).toMatchObject({ city: "Prague" });
expect(parseDeliveryAddressSnapshot({ line1: "Main 1" })).toBeNull();
expect(DEFAULT_USER_SETTINGS).toEqual({ ringtone_volume: 80 });
```

pgTAP must accept a `NULL` legacy snapshot and a valid object, reject JSON scalars, and prove `client_profile_density` is absent.

- [ ] **Step 2: Run the tests to prove the baseline fails.**

Run: `npm test -- tests/delivery-address.test.ts tests/settings.test.ts tests/user-preferences-contract.test.ts`

Run: `npx supabase test db --file supabase/tests/database/delivery_address_snapshot_test.sql --file supabase/tests/database/user_preferences_rls_test.sql`

- [ ] **Step 3: Create migration, regenerate types, and remove density persistence.**

```sql
alter table public.orders add column if not exists delivery_address_snapshot jsonb;
alter table public.orders add constraint orders_delivery_address_snapshot_object_check check (
  delivery_address_snapshot is null or (
    jsonb_typeof(delivery_address_snapshot) = 'object' and
    delivery_address_snapshot ?& array['recipient_name','line1','city','postal_code','country']
  )
);
alter table public.workspace_user_preferences drop column if exists client_profile_density;
```

Remove density from defaults, localStorage migration, DAL select/upsert, hook state, generated types, and fixtures. Preserve ringtone and RLS.

- [ ] **Step 4: Implement pure address types.**

```ts
export interface DeliveryAddressSnapshot {
  recipient_name: string; line1: string; line2?: string;
  city: string; postal_code: string; country: string;
}
export interface VerifiedDeliveryAddress {
  orderId: string; address: DeliveryAddressSnapshot; deliveredAt: string;
}
export function parseDeliveryAddressSnapshot(value: unknown): DeliveryAddressSnapshot | null;
```

- [ ] **Step 5: Verify and commit.**

Run: `npm test -- tests/delivery-address.test.ts tests/settings.test.ts tests/user-preferences-contract.test.ts`

Run: `npx supabase db reset --local`

Run: `npx supabase test db --file supabase/tests/database/delivery_address_snapshot_test.sql --file supabase/tests/database/user_preferences_rls_test.sql`

Commit: `feat: add verified delivery address model`

### Task 2: Read model, assignment guard, and atomic order inputs

**Files:**
- Create: `src/components/orders/DeliveryAddressFields.tsx`
- Modify: `src/lib/dal/activity.ts`, `src/lib/dal/conversationBrief.ts`, `src/lib/dal/leadNotes.ts`
- Modify: `src/lib/dal/orders.ts`, `src/lib/dal/leadQueue.ts`, migration from Task 1
- Modify: `src/components/orders/OrderCreateForm.tsx`, `src/components/workspace/ProductOrderPanel.tsx`, `src/app/workspace/page.tsx`
- Modify: `tests/delivery-address.test.ts`, `tests/conversation-brief-contract.test.ts`, `tests/post-call-completion-runtime.test.ts`, `tests/atomic-business-audit.test.ts`

**Consumes:** address types from Task 1.

**Produces:** verified-address selector, assignment-scoped note writes, and address persistence in manual and post-call order flows.

- [ ] **Step 1: Write failing selection, authorization, and forwarding tests.**

```ts
expect(findLatestVerifiedDeliveryAddress([
  { id: "cancelled", status: "cancelled", delivered_at: "2026-09-10T10:00:00Z", created_at: "2026-09-10T10:00:00Z", delivery_address_snapshot: validAddress },
  { id: "delivered", status: "delivered", delivered_at: "2026-09-09T10:00:00Z", created_at: "2026-09-09T10:00:00Z", delivery_address_snapshot: validAddress },
])).toMatchObject({ orderId: "delivered" });
await expect(createLeadNoteForWorkspace("foreign-lead", "blocked")).rejects.toMatchObject({ code: "FORBIDDEN" });
```

Also assert both order forms use `DeliveryAddressFields`, invalid addresses stop RPC calls, and repeated post-call completion yields one order snapshot.

- [ ] **Step 2: Run tests and confirm they fail.**

Run: `npm test -- tests/delivery-address.test.ts tests/conversation-brief-contract.test.ts tests/post-call-completion-runtime.test.ts tests/atomic-business-audit.test.ts`

- [ ] **Step 3: Implement selector, DAL, and note guard.**

`findLatestVerifiedDeliveryAddress` returns only parseable `delivered` rows, ordered by `delivered_at` descending. Add `delivered_at` and snapshot to activity/brief DTOs. In `createLeadNoteForWorkspace`, call the existing scoped-lead guard for `operator` before insert.

- [ ] **Step 4: Implement shared address input and atomic RPC propagation.**

```tsx
export interface DeliveryAddressDraft {
  recipient_name: string; line1: string; line2: string;
  city: string; postal_code: string; country: string;
}
export function DeliveryAddressFields(props: {
  value: DeliveryAddressDraft; onChange(next: DeliveryAddressDraft): void;
  disabled?: boolean; idPrefix: string;
}): React.ReactElement;
```

Use labels, address autocomplete tokens, required-field errors, and disabled submit until valid. Validate in `createOrderForWorkspace` and `completeLeadCallForWorkspace`. Extend `create_order_with_items` and `complete_lead_call_with_order_items_idempotent` with a JSONB snapshot argument and insert it in their existing transactions.

- [ ] **Step 5: Verify and commit.**

Run: `npm test -- tests/delivery-address.test.ts tests/conversation-brief-contract.test.ts tests/post-call-completion-runtime.test.ts tests/atomic-business-audit.test.ts`

Run: `npx supabase test db`

Commit: `feat: capture delivery address with orders`

### Task 3: Klientský profil a focus režim Workspace

**Files:**
- Create: `src/components/leads/ClientProfileNotes.tsx`, `tests/client-profile-page-contract.test.ts`
- Delete: `src/components/workspace/ClientProfileCard.tsx`, `src/components/workspace/clientProfileDensity.ts`, `tests/client-profile-density.test.ts`
- Modify: `src/app/leads/[leadId]/page.tsx`, `src/components/leads/Customer360RetentionCard.tsx`
- Modify: `src/app/workspace/page.tsx`, `src/components/workspace/OperatorLeadHeader.tsx`, `src/components/workspace/ProductScriptPanel.tsx`
- Modify: `tests/customer-360-ui-contract.test.ts`, `tests/workflow-ui-contract.test.ts`, `tests/product-script-sections.test.ts`, `tests/crm-color-hierarchy.test.ts`

**Consumes:** read model from Task 2.

**Produces:** read-only profile with notes, concise customer header, safe new-tab link, and non-modal script focus mode.

- [ ] **Step 1: Write failing profile and Workspace UI contracts.**

```ts
expect(profilePage).toContain("Klientský profil");
expect(profilePage).toContain("Read-only customer record");
expect(profilePage).toContain("<ClientProfileNotes");
expect(profilePage).not.toContain("updateLeadStatusAction");
expect(workspacePage).not.toContain("ClientProfileCard");
expect(leadHeader).toContain('target="_blank"');
expect(scriptPanel).toContain("Expand script");
expect(scriptPanel).toContain("Collapse script");
```

- [ ] **Step 2: Run tests and confirm failure.**

Run: `npm test -- tests/client-profile-page-contract.test.ts tests/customer-360-ui-contract.test.ts tests/workflow-ui-contract.test.ts tests/product-script-sections.test.ts tests/crm-color-hierarchy.test.ts`

- [ ] **Step 3: Implement profile and notes.**

Keep `getScopedLeadForWorkspace(leadId)` as first guard, then load history/notes. The client notes component calls only `createLeadNoteAction`, prepends its result, and shows author/time. Render `Address not yet verified` when no delivered snapshot exists; never substitute lead city/country.

- [ ] **Step 4: Implement concise header and focus mode.**

Remove ClientProfileCard/density state. Header renders phone, email, status, score, last outcome, callback, and verified-address state, plus:

```tsx
<Link href={`/leads/${activeLead.id}`} target="_blank" rel="noopener noreferrer">
  Open Client Profile
</Link>
```

Keep `isScriptExpanded` in WorkspaceContent. ProductScriptPanel receives `isExpanded` and `onExpandedChange`, using an `aria-pressed` Expand/Collapse button. Desktop gives script dominant space with a sticky summary; narrow layouts keep the summary above it.

- [ ] **Step 5: Verify and commit.**

Run: `npm test -- tests/client-profile-page-contract.test.ts tests/customer-360-ui-contract.test.ts tests/workflow-ui-contract.test.ts tests/product-script-sections.test.ts tests/crm-color-hierarchy.test.ts`

Run: `npm run lint`

Commit: `feat: focus operator workspace on client and script`

### Task 4: Full verification and evidence

**Files:**
- Create: `docs/superpowers/reports/2026-09-11-operator-client-profile-verification.md`
- Modify: `PROJECT.md`, `README.md`, `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/README.md`

- [ ] **Step 1: Run complete checks.**

Run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx supabase test db`, and `git diff --check`.

Expected: each exits 0; record exact results and environment limits.

- [ ] **Step 2: Run authenticated operator browser smoke test.**

Verify assignment summary, expand/collapse script, profile in new tab, no client editing, append note, address capture in both order paths, verified address after a delivered order/reload, and rejection of foreign access.

- [ ] **Step 3: Record verified behavior and commit.**

Document that legacy addresses are never inferred and verification needs a delivered snapshot. Commit: `docs: verify operator client profile workflow`.

## Completion Definition

An operator keeps Workspace active, expands the approved script, opens a safe read-only profile in a new tab, appends a note, and sees a validated address only after a real delivered order. Both order paths persist it atomically; no historic address is invented.
