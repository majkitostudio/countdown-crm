# P1 Products Resilience and Role Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the product catalog visible when enrichment sources fail, distinguish unavailable counts from zero, and make the operator surface read-only while preserving server-side authorization as the authority.

**Architecture:** Keep products as the primary read model and load objections/order counts as independent enrichment. Move role truth into the server page boundary and pass the verified workspace role to a small client catalog surface; `ProductCard` uses that role-derived capability only to shape affordances. Mutations continue through existing Server Actions/DAL guards and reload through the same safe catalog loader after success.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Server Actions/DAL, Vitest.

**Spec:** `docs/superpowers/plans/2026-09-08-p1-source-and-role-contracts.md` at commit `55b96b67de4bf52a2f2a79ac5a2d3dd0cb329c4b`, plus `docs/AKTUALNI_STAV_A_DESATERO.md` (P1.1 and P1.2).

## Global Constraints

- Do not begin implementation until the exact Spec commit above is available in the execution context.
- Do not modify DAL files unless a failing test proves a real server contract defect; stop and send Sol the exact evidence before doing so.
- Product data is primary; objections and order counts are enrichment.
- `unavailable` never renders as `0`, `[]`, or a successful catalog state.
- Operators may read products and truthful enrichment states but must not see Add, Edit, Delete, Reassign, or New Objection affordances.
- UI hiding is not authorization; existing server role/workspace guards remain authoritative.
- `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, and `CONFLICT` errors remain fatal and are not downgraded to partial catalog UI. Only `DATABASE`, or an explicit provider adapter failure, may become source unavailable.
- After a successful mutation, reload through the same safe loader; do not splice optimistic data into the catalog.

---

### Task 1: Define primary/enrichment states and role surface in tests

**Files:**
- Create: `tests/products-resilience.test.ts`
- Create: `tests/products-role-surface.test.ts`
- Read-only references: `src/app/products/page.tsx`, `src/components/products/ProductCard.tsx`, `src/lib/products.ts`

**Interfaces:**
- Consumes: `Product`, `WorkspaceRole`, `getProducts`, `listObjectionsAction`, `listOrderProductCountsAction`, and the Spec's `SourceState<T>` vocabulary.
- Produces: the exact `ProductCatalogLoadResult` state shape and `ProductCard` role prop expected by later tasks.

- [ ] **Step 1: Write the failing primary/enrichment tests**

Create a pure loader test contract with explicit source states:

```ts
it("keeps products when objections enrichment fails", async () => {
  const result = await loadProductCatalog({
    loadProducts: async () => [product],
    loadObjections: async () => { throw new Error("Objections unavailable"); },
    loadOrderCounts: async () => ({ [product.id]: 3 }),
  });

  expect(result.state).toBe("partial");
  expect(result.products).toEqual([product]);
  expect(result.enrichment.objections).toEqual({ status: "unavailable", reason: "database", message: "Objections unavailable" });
  expect(result.orderCounts[product.id]).toBe(3);
});

it("does not turn unavailable order counts into zero", async () => {
  const result = await loadProductCatalog({
    loadProducts: async () => [product],
    loadObjections: async () => [],
    loadOrderCounts: async () => { throw new Error("Order counts unavailable"); },
  });

  expect(result.orderCountsState).toEqual({ status: "unavailable", reason: "database", message: "Order counts unavailable" });
  expect(result.orderCounts[product.id]).toBeUndefined();
});

it("derives empty from a ready empty catalog and does not load enrichment", async () => {
  const loadObjections = vi.fn(async () => []);
  const loadOrderCounts = vi.fn(async () => ({}));
  const result = await loadProductCatalog({
    loadProducts: async () => [],
    loadObjections,
    loadOrderCounts,
  });

  expect(result.state).toBe("ready");
  expect(result.isEmpty).toBe(true);
  expect(result.enrichment.objections).toEqual({ requested: false, reason: "no_products" });
  expect(result.enrichment.orderCounts).toEqual({ requested: false, reason: "no_products" });
  expect(loadObjections).not.toHaveBeenCalled();
  expect(loadOrderCounts).not.toHaveBeenCalled();
});

it("fails when the primary catalog fails", async () => {
  await expect(loadProductCatalog({
    loadProducts: async () => { throw new DataAccessError("FORBIDDEN", "Forbidden"); },
    loadObjections: async () => [],
    loadOrderCounts: async () => ({}),
  })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
```

- [ ] **Step 2: Write the failing role-surface tests**

Render `ProductCard` to static markup for `operator`, `team_leader`, and `administrator` and assert:

```ts
it("renders only read affordances for operators", () => {
  const markup = renderToStaticMarkup(React.createElement(ProductCard, {
    product,
    role: "operator",
    onOpenObjections: vi.fn(),
    onEditProduct: vi.fn(),
    orderCount: 4,
    onReassignOrders: vi.fn(),
    onDeleteProduct: vi.fn(),
  }));

  expect(markup).toContain("View Objections");
  expect(markup).not.toContain("Edit Product");
  expect(markup).not.toContain("Delete product");
  expect(markup).not.toContain("Reassign");
});
```

Add the positive manager/admin assertions and a source contract that the server page invokes `requireWorkspaceContext`/`requireWorkspaceRole` before rendering the client surface.

- [ ] **Step 3: Run both new tests to verify the expected RED state**

Run: `npm test -- tests/products-resilience.test.ts tests/products-role-surface.test.ts`

Expected: FAIL because no explicit catalog state loader or role prop exists; existing unrelated product tests must not be changed to make these tests pass.

- [ ] **Step 4: Commit the red contracts**

```powershell
git add tests/products-resilience.test.ts tests/products-role-surface.test.ts
git commit -m "test: define truthful product enrichment states"
```

### Task 2: Implement the minimal catalog loader with partial enrichment

**Files:**
- Create: `src/lib/productCatalog.ts`
- Modify: `src/app/products/page.tsx` only if a server wrapper is needed
- Modify: `tests/products-resilience.test.ts`

**Interfaces:**
- Consumes: `getProducts()`, `listObjectionsAction()`, `listOrderProductCountsAction()`, and the approved fatal-error classifier.
- Produces: `loadProductCatalog(loaders): Promise<ProductCatalogLoadResult>` with `catalog: SourceState<Product[]>`, `state: "ready" | "partial" | "unavailable"`, `isEmpty` derived only from `catalog.status === "ready" && catalog.data.length === 0`, and enrichment values typed as `EnrichmentState<T> = { requested: false; reason: "no_products" } | { requested: true; source: SourceState<T> }`. Fatal errors reject.

- [ ] **Step 1: Add one failing test for an empty primary catalog**

Assert that a primary `[]` is `catalog.status === "ready"` with derived `isEmpty === true`, and that the loader short-circuits without calling enrichment loaders. For a non-empty ready catalog, an enrichment database rejection is `state: "partial"` and never sets a count to zero.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/products-resilience.test.ts`

Expected: FAIL because `loadProductCatalog` does not exist.

- [ ] **Step 3: Implement the minimal loader**

Load the primary catalog first. If it is ready with an empty array, do not call enrichment loaders; return `state: "ready"`, `isEmpty: true`, and `{ requested: false, reason: "no_products" }` metadata for each enrichment. If it is ready with products, load objections and order counts independently; classify only `DataAccessError("DATABASE")` or an explicit provider-adapter failure as unavailable. Preserve source messages and omit unavailable order-count entries rather than inserting `0`. Re-throw `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, and `CONFLICT` from any source. Map objection cards onto products only when the objections source is ready.

- [ ] **Step 4: Run the focused tests and existing product contract tests**

Run: `npm test -- tests/products-resilience.test.ts tests/product-script-sections.test.ts tests/product-card-image.test.ts`

Expected: PASS, with the existing image/script contracts unchanged.

- [ ] **Step 5: Commit the loader**

```powershell
git add src/lib/productCatalog.ts tests/products-resilience.test.ts
git commit -m "feat: preserve product catalog through enrichment failures"
```

### Task 3: Enforce role-truthful Product UI and safe reloads

**Files:**
- Modify: `src/app/products/page.tsx` (`ProductsPage`, `loadProducts`, action handlers)
- Create: `src/app/products/ProductCatalogClient.tsx` only if needed to keep the page server-authorized and the interactive catalog client-side
- Modify: `src/components/products/ProductCard.tsx` (`ProductCardProps`, action affordance rendering)
- Modify: `tests/products-role-surface.test.ts`

**Interfaces:**
- Consumes: `WorkspaceContext.role` from the server page boundary, `ProductCatalogLoadResult`, and existing mutation action signatures.
- Produces: operator read-only markup; Team Leader/Administrator manage affordances; every successful mutation calls the same `loadProductCatalog` path; every server action still receives its existing workspace/role guard.

- [ ] **Step 1: Add a failing test for page boundary and reload behavior**

Assert the page is not a client-only authorization boundary, that role is passed into the client catalog, and that `onSaved`/delete/reassign handlers invoke the safe loader after a resolved mutation. Add a negative source assertion that no operator branch calls `setProducts` with a mutation response.

- [ ] **Step 2: Run the focused role tests and verify RED**

Run: `npm test -- tests/products-role-surface.test.ts`

Expected: FAIL on the missing role prop, visible operator mutation titles, and missing safe-loader contract.

- [ ] **Step 3: Implement the minimal role-aware surface**

Use the verified server role to derive `canManageProducts = role !== "operator"`. Render only View Objections plus truthful read-only enrichment states for operators. Render Add/Edit/Delete/Reassign/New Objection and transcript synchronization only for Team Leaders/Administrators. Keep the server action calls unchanged. After each successful mutation, clear the local error and await `loadProductCatalog()`; do not silently assume success when reload fails.

- [ ] **Step 4: Run focused and full product tests**

Run: `npm test -- tests/products-resilience.test.ts tests/products-role-surface.test.ts tests/product-script-sections.test.ts tests/product-card-image.test.ts`

Expected: PASS with operator markup containing no forbidden affordances and manager/admin markup retaining the existing actions.

- [ ] **Step 5: Commit the role surface**

```powershell
git add src/app/products/page.tsx src/app/products/ProductCatalogClient.tsx src/components/products/ProductCard.tsx tests/products-role-surface.test.ts
git commit -m "fix: make product controls role truthful"
```

### Task 4: Verify the contract and stop on DAL evidence

**Files:**
- Modify only if required by a failing test: the files from Tasks 1–3
- Never modify: `src/lib/dal/*` without an explicit Sol handoff containing the failing contract evidence

**Interfaces:**
- Consumes: approved source-state/role spec and the loader/UI contracts.
- Produces: focused verification evidence or a precise blocker for Sol.

- [ ] **Step 1: Audit server-side authority**

Trace every Add/Edit/Delete/Reassign/New Objection action to its current Server Action and DAL guard. If the operator can invoke a server mutation despite hidden UI, record the exact action, failing test, and guard location; stop and hand it to Sol before changing DAL.

- [ ] **Step 2: Run fresh verification**

Run: `npm test -- tests/products-resilience.test.ts tests/products-role-surface.test.ts && npm run lint && npm run typecheck && git diff --check`

Expected: exit 0 with the focused product tests passing. Do not claim browser or linked-sandbox verification from these commands.

- [ ] **Step 3: Commit only verified product files**

```powershell
git add src/app/products/page.tsx src/app/products/ProductCatalogClient.tsx src/components/products/ProductCard.tsx src/lib/productCatalog.ts tests/products-resilience.test.ts tests/products-role-surface.test.ts
git commit -m "fix: stabilize products partial data and role truth"
```
