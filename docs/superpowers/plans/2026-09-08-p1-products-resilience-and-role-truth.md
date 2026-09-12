# P1 Products Resilience and Role Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a truthful Product Catalog when its independent enrichment sources fail and expose only role-appropriate product controls without weakening server authorization.

**Architecture:** The server Products route resolves the authoritative workspace context, loads a serializable catalog snapshot through a server-only composite loader, and passes the verified role plus initial snapshot to a client surface. The composite loader reads products first, classifies failures before any Server Action transport, and conditionally loads objections and order counts only for a non-empty ready catalog. Client mutations remain protected by existing Server Actions and DAL guards, then replace the local snapshot by invoking the same safe loader action.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase DAL, Server Actions, Vitest.

**Spec:** `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md` and `docs/AKTUALNI_STAV_A_DESATERO.md` (P1.1 and P1.2).

## Global Constraints

- Product data is the primary source; objections and order counts are independent enrichment.
- Only `DataAccessError` with code `DATABASE` becomes `{ status: "unavailable", reason: "database" }`.
- `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT`, and unknown errors are request-level failures and must reject unchanged.
- `0`, `[]`, and `null` represent only verified ready data; no unavailable source may use them as a fallback.
- A ready empty product catalog is `isEmpty: true`; it must not request objections or order counts.
- Product catalog source classification happens in server-only code before a Server Action returns data to the browser.
- Operators may read products and the truthful state of objections/order counts, but must not see Add, Edit, Delete, Reassign, New Objection, objection-edit, or transcript synchronization affordances.
- Team Leaders and Administrators retain the existing management affordances. Existing Server Action and DAL guards remain authoritative.
- After every successful product, objection, or reassignment mutation, reload via `loadProductCatalogAction` and replace the complete client snapshot. Do not append, splice, or otherwise optimistically mutate catalog data.
- Do not modify existing `src/lib/dal/products.ts`, `src/lib/dal/objections.ts`, or `src/lib/dal/orders.ts` unless a test proves a server contract defect. If that happens, stop and report the failing evidence before changing a DAL guard.
- Do not introduce a generic source-availability abstraction; this type contract belongs only to Products.

---

### Task 1: Define the server-only catalog loader contract

**Files:**
- Create: `tests/products-resilience.test.ts`
- Create: `src/lib/dal/productCatalog.ts`

**Interfaces:**
- Consumes: `WorkspaceContext`, `listProductsForWorkspace`, `listObjectionsForWorkspace`, `listOrderProductCountsForWorkspace`, `DataAccessError`.
- Produces:

```ts
export type ProductCatalogSource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" };

export type ProductCatalogEnrichment<T> =
  | { requested: false; reason: "no_products" | "catalog_unavailable" }
  | { requested: true; source: ProductCatalogSource<T> };

export interface ProductCatalogLoadResult {
  catalog: ProductCatalogSource<Product[]>;
  objections: ProductCatalogEnrichment<ObjectionDTO[]>;
  orderCounts: ProductCatalogEnrichment<Record<string, number>>;
  state: "ready" | "partial" | "unavailable";
  isEmpty: boolean;
}

export async function loadProductCatalog(context: WorkspaceContext): Promise<ProductCatalogLoadResult>;
```

- [ ] **Step 1: Write failing loader tests**

Mock the three direct DAL readers, not their Server Action wrappers. Use a complete product fixture and literal expected state values. Cover ready data, an objection `DATABASE` failure, an order-count `DATABASE` failure, both enrichment failures, a primary `DATABASE` failure, a ready empty catalog, every fatal non-`DATABASE` `DataAccessError` code, and an unknown `Error`.

```ts
it("keeps ready products and order counts when objections are database-unavailable", async () => {
  mocks.listProductsForWorkspace.mockResolvedValue([productDto]);
  mocks.listObjectionsForWorkspace.mockRejectedValue(
    new DataAccessError("DATABASE", "Unable to load objection cards."),
  );
  mocks.listOrderProductCountsForWorkspace.mockResolvedValue({ "product-1": 3 });

  await expect(loadProductCatalog(context)).resolves.toMatchObject({
    catalog: { status: "ready", data: [{ id: "product-1" }] },
    objections: { requested: true, source: { status: "unavailable", reason: "database" } },
    orderCounts: { requested: true, source: { status: "ready", data: { "product-1": 3 } } },
    state: "partial",
    isEmpty: false,
  });
});
```

The primary database case must yield `{ state: "unavailable", isEmpty: false }` and neither enrichment reader may be called. The empty catalog case must yield `{ state: "ready", isEmpty: true }` and neither enrichment reader may be called.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/products-resilience.test.ts`

Expected: FAIL because `@/lib/dal/productCatalog` does not yet exist.

- [ ] **Step 3: Implement the smallest server-only loader**

Add `import "server-only";`. Load products first with the verified `context.workspaceId`. Convert only `isDataAccessError(error) && error.code === "DATABASE"` to the unavailable state. Rethrow every other error. If the product catalog is unavailable, return unrequested enrichment with `reason: "catalog_unavailable"`; if it is ready and empty, return unrequested enrichment with `reason: "no_products"`. For a non-empty ready catalog, load objections and counts independently and derive `state: "partial"` when either enrichment is unavailable. Map nullable DAL product fields to the existing client `Product` shape without inventing a domain fallback for a failed source.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/products-resilience.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the loader contract**

```powershell
git add tests/products-resilience.test.ts src/lib/dal/productCatalog.ts
git commit -m "feat: add truthful product catalog loader"
```

### Task 2: Make the Products route a server boundary and expose one safe refresh action

**Files:**
- Create: `src/app/actions/productCatalog.ts`
- Modify: `src/app/products/page.tsx`
- Create: `src/app/products/ProductCatalogClient.tsx`
- Create: `tests/products-route-boundary.test.ts`

**Interfaces:**
- Consumes: `requireWorkspaceContext()`, `loadProductCatalog(context)`, `WorkspaceRole`, `ProductCatalogLoadResult`.
- Produces:

```ts
export async function loadProductCatalogAction(): Promise<ProductCatalogLoadResult>;
export default async function ProductsPage(): Promise<React.ReactElement>;
```

- [ ] **Step 1: Write failing route/action tests**

Mock `requireWorkspaceContext` and `loadProductCatalog`. Assert that the route returns the actual fatal error from the loader, passes a verified `WorkspaceContext` to the loader, and passes the resolved `role` plus snapshot to the client surface. Test the Server Action separately: it resolves its own workspace context, calls `loadProductCatalog`, returns the exact snapshot, and does not catch fatal failures.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/products-route-boundary.test.ts`

Expected: FAIL because the page is currently a client component and no safe refresh action exists.

- [ ] **Step 3: Implement the server route and refresh action**

Make `src/app/products/page.tsx` a server component that calls `requireWorkspaceContext()` once, loads the initial snapshot through `loadProductCatalog(context)`, and renders `ProductCatalogClient` with `role={context.role}` and `initialCatalog={snapshot}`. Put interactive state and browser event handlers into `ProductCatalogClient.tsx`. Implement `loadProductCatalogAction` as a Server Action that resolves current context and delegates to the same loader. Do not call client-facing source actions from the composite loader.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/products-route-boundary.test.ts tests/products-resilience.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the server boundary**

```powershell
git add src/app/actions/productCatalog.ts src/app/products/page.tsx src/app/products/ProductCatalogClient.tsx tests/products-route-boundary.test.ts
git commit -m "feat: load products safely at the server boundary"
```

### Task 3: Render source state and role state truthfully

**Files:**
- Modify: `src/app/products/ProductCatalogClient.tsx`
- Modify: `src/components/products/ProductCard.tsx`
- Modify: `src/components/products/ObjectionDrawer.tsx`
- Create: `tests/products-role-surface.test.ts`
- Modify: `tests/product-card-image.test.ts`

**Interfaces:**
- Consumes: `WorkspaceRole`, `ProductCatalogLoadResult`, `ProductCard`, `ObjectionDrawer`.
- Produces: a read-only operator catalog and management-capable Team Leader/Administrator catalog.

- [ ] **Step 1: Write failing surface tests**

Render the real client/catalog card surface with a ready snapshot and each role. Assert that operators retain `View Objections` but do not see `Add New Product`, `Edit Product`, `Delete product`, `Reassign`, `New Objection`, or `Synchronizovat hovory`. Assert Team Leaders and Administrators retain `Add New Product` and `Edit Product`. Assert a database-unavailable objection source renders an unavailable label rather than `0 Battle-Card Rebuttals`, and an unavailable count source renders neither `0` nor a reassignment affordance. Update the image-fallback fixture with required role and ready source state.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/products-role-surface.test.ts tests/product-card-image.test.ts`

Expected: FAIL because Product controls are currently unconditional and unavailable enrichments become empty values.

- [ ] **Step 3: Implement the smallest truthful presentation**

Derive `canManageProducts` only from `role === "team_leader" || role === "administrator"`. Render header actions, product editing/deletion/reassignment, objection creation/editing, transcript synchronization, product and objection editor modals, and reassignment modal only when it is true. Leave `View Objections` available to all roles. Pass enrichment availability into cards/drawer so a ready missing count is a verified zero, but an unavailable source is labelled unavailable. When objections are unavailable, the drawer shows that state rather than an empty objection list.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/products-role-surface.test.ts tests/product-card-image.test.ts tests/products-route-boundary.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the role/state surface**

```powershell
git add src/app/products/ProductCatalogClient.tsx src/components/products/ProductCard.tsx src/components/products/ObjectionDrawer.tsx tests/products-role-surface.test.ts tests/product-card-image.test.ts
git commit -m "fix: make products source and role state truthful"
```

### Task 4: Replace optimistic mutation updates with safe snapshot refreshes

**Files:**
- Modify: `src/app/products/ProductCatalogClient.tsx`
- Modify: `src/components/products/ProductModal.tsx`
- Modify: `src/components/products/ObjectionDrawer.tsx`
- Modify: `src/components/products/ObjectionEditorModal.tsx`
- Create: `tests/products-refresh.test.ts`

**Interfaces:**
- Consumes: `loadProductCatalogAction`, existing product/objection/reassignment Server Actions.
- Produces: `reloadCatalog(): Promise<void>` that replaces the stored `ProductCatalogLoadResult` after a completed mutation.

- [ ] **Step 1: Write failing refresh tests**

Use the real callback contracts with mocked Server Action boundaries. Verify a successful save, delete, objection create/update/delete, and reassignment awaits `loadProductCatalogAction` and displays the returned whole snapshot. Verify a refresh rejection leaves the previous snapshot intact and surfaces an error. Verify the drawer does not append a created objection locally before the refresh resolves.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/products-refresh.test.ts`

Expected: FAIL because callbacks are synchronous and the drawer locally appends a created objection.

- [ ] **Step 3: Implement safe refresh callbacks**

Make save/update callbacks return `Promise<void>` and await them before closing the successful modal. In the client surface, implement one `reloadCatalog` function that awaits `loadProductCatalogAction()` and calls a single snapshot setter with the result. Call it only after a mutation Server Action resolves. Remove `setProducts`, local objection append, and mutation-response insertion from catalog mutation paths. If reload rejects, keep the existing snapshot and present the reload error; do not label stale data as freshly loaded.

- [ ] **Step 4: Run focused product tests and verify GREEN**

Run: `npm test -- tests/products-resilience.test.ts tests/products-route-boundary.test.ts tests/products-role-surface.test.ts tests/products-refresh.test.ts tests/product-card-image.test.ts tests/product-script-sections.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the refresh behavior**

```powershell
git add src/app/products/ProductCatalogClient.tsx src/components/products/ProductModal.tsx src/components/products/ObjectionDrawer.tsx src/components/products/ObjectionEditorModal.tsx tests/products-refresh.test.ts
git commit -m "fix: refresh products from safe catalog snapshots"
```

### Task 5: Audit, review, and verify the completed slice

**Files:**
- Verify: all files changed by Tasks 1–4
- Never modify without new failing evidence: `src/lib/dal/products.ts`, `src/lib/dal/objections.ts`, `src/lib/dal/orders.ts`

**Interfaces:**
- Consumes: the binding source/role contract and all focused tests.
- Produces: verification evidence suitable for an independent review and a PR; it does not merge.

- [ ] **Step 1: Audit server authority**

Trace existing mutation actions to their DAL guards and confirm Product create/update/delete, objection create/update/delete, and order reassignment still use `requireWorkspaceRole(["team_leader", "administrator"])`. Record any mismatch as a blocker rather than weakening the UI or DAL contract.

- [ ] **Step 2: Perform independent code review**

Give a fresh reviewer the final diff and this plan. Require review of the fatal-error classifier, primary/empty short circuits, false-zero prevention, role affordance coverage, and every post-mutation refresh path. Fix every critical or important finding before proceeding.

- [ ] **Step 3: Run fresh full verification**

Run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: every command exits `0`; no browser, production credential, linked environment, DAL mutation, or automatic merge is implied by those commands.

- [ ] **Step 4: Prepare, but do not merge, the PR**

Commit only verified final files, provide the test/review evidence, and open a PR only after the user asks for it. Do not merge automatically.
