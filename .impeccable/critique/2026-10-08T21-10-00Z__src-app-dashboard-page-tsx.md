Method: dual-agent (A: Dashboard design assessment · B: Dashboard detector)

# Countdown CRM — Dashboard and System Audit

**Scope and evidence:** Source review of the admin dashboard and relevant shared components, static Impeccable detector over `src`, and the previously saved local walkthrough covering 22 routes. This is not a production walkthrough. The current Chrome session did not expose the authenticated Countdown CRM application to Playwright or to the accessibility tree, so production data, account creation, and the app at 1920×1080 were not verified. No production data or settings were changed.

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|---|---:|---|
| 1 | Accessibility | 3/4 | Shared navigation has accessible labels and keyboard behavior, but some touch targets and text labels are small; contrast was not measured in a live browser. |
| 2 | Performance | 3/4 | No source-level performance blocker verified; three global glass utilities use backdrop blur, but no runtime profiling was possible. |
| 3 | Responsive Design | 3/4 | Responsive grids and mobile sidebar behavior exist; rendered behavior at 1920×1080 and narrow widths remains unverified. |
| 4 | Theming | 2/4 | Global tokens exist, but literal Tailwind color utilities occur in 119 source files (2,184 matches), making theme consistency harder to maintain. |
| 5 | Implementation Integrity | 2/4 | Product-specific role boundaries and honest pilot states are present, alongside verified authorization and commission-calculation defects. |
| **Total** | | **13/20** | **Acceptable — significant work remains, especially in security and financial correctness.** |

## Implementation Integrity Verdict

**Fail for production readiness; pass for product-specific intent.** The CRM is recognizably tailored to call-center operations: roles, leads, operator workspace, training boundaries, order fulfillment, wallet, and honest pilot limitations are reflected in the code. The detector returned 16 warnings across six files, but contextual inspection found these to be line-level color co-location false positives or one isolated color-style opinion, not confirmed contrast defects. However, source review also verified high-impact authorization gaps and a monthly commission calculation error. Their deployment state has not been checked.

## Design Health Score

Source-only assessment of the admin dashboard; previous local UI critique scored 23/40 over its own walkthrough. The current dual assessment scores:

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Pilot limitations are stated; independently loading widgets still need clear, consistent recovery. |
| 2 | Match System / Real World | 2/4 | English and Czech labels coexist; reporting periods and some terms are unclear. |
| 3 | User Control and Freedom | 2/4 | Main paths are linked, but dashboard scope and timeframe controls are not apparent. |
| 4 | Consistency and Standards | 2/4 | Reusable card structure, but inconsistent language, wording, and date locale. |
| 5 | Error Prevention | 3/4 | Honest pilot/read-only labels help; the dashboard does not resolve ambiguous data scope. |
| 6 | Recognition Rather Than Recall | 3/4 | Scope labels and action links help; metric periods/definitions are missing in places. |
| 7 | Flexibility and Efficiency | 2/4 | Lead creation and operator launch are direct; few dashboard filters or personalization options are visible. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Grouping is clear, but repeated cards and unavailable analytics dilute the main action. |
| 9 | Error Recovery | 2/4 | Some loading/error states are explained, but recovery actions are inconsistent. |
| 10 | Help and Documentation | 1/4 | No visible dashboard metric glossary or contextual admin help. |
| **Total** | | **22/40** | **Acceptable; improve clarity and first-screen prioritization.** |

## Executive Summary

- **Audit Health:** 13/20 — Acceptable, based on source review rather than production runtime.
- **Design Health:** 22/40 in the dual source-only assessment; the earlier local walkthrough rated the broader UI at 23/40.
- **Substantive findings:** 3 P1 (two authorization risks and one commission integrity bug), 5 P2 (localization, dashboard scope/timeframe, navigation density, touch-target sizing, and theme-token drift), 0 P0/P3. Detector-only warnings are excluded from this count because context verification found no confirmed visual defect.
- **Most urgent:** make webhook authentication fail closed; put authorization inside the `SECURITY DEFINER` tracking RPC or limit it to `service_role`; correct the returned-order cohort used for monthly commission.
- **Production caveat:** `CARRIER_WEBHOOK_SECRET`, deployed migrations, Auth users, and actual live data remain unverified. The account-creation request was not executed.

## Detailed Findings

### P1 — Major

#### [P1] Carrier webhook authentication fails open
- **Location:** `src/app/api/carriers/webhook/route.ts:66-76,93-142`
- **Category:** Implementation Integrity / Security
- **Impact:** If `CARRIER_WEBHOOK_SECRET` is unset or empty, the handler skips authentication. The route uses an admin client and accepts caller-supplied order IDs/tracking numbers and delivery/return statuses; an unauthenticated request could alter fulfillment state and trigger financial side effects.
- **Standard:** Server-side authentication and authorization; fail-closed secret configuration.
- **Recommendation:** Reject requests in deployed environments when the configured secret is missing; validate deployment configuration and add a test for the missing-secret case. Verify the production setting read-only before claiming live exploitability.
- **Suggested command:** Outside Impeccable's UI command scope; fix and test the server route directly.

#### [P1] Authenticated users can directly invoke privileged tracking RPC
- **Location:** `supabase/migrations/20261007140100_shipment_timeline_and_courier_webhook.sql:12-36,56-69,109-110`
- **Category:** Implementation Integrity / Security
- **Impact:** `record_order_tracking_event` is `SECURITY DEFINER`, updates by order ID without checking caller identity, workspace membership, team scope, or manager role, and is granted to `authenticated`. The function can set delivery/return status and the fulfillment-event context, bypassing DAL role checks.
- **Standard:** Database authorization must be enforced at the privileged RPC boundary.
- **Recommendation:** Revoke execution from `authenticated` and expose a separately authorized user RPC, or add an order-specific workspace/team role check inside this function. Add database tests for unauthorized cross-workspace calls.
- **Suggested command:** Outside Impeccable's UI command scope; fix the migration and database authorization tests directly.

#### [P1] Returned orders can be double-subtracted from monthly commission
- **Location:** `supabase/migrations/20261007213000_wallet_monthly_settlement_manager_access.sql:63-88`
- **Category:** Implementation Integrity / Financial correctness
- **Impact:** `delivered_total` includes only orders whose current status is `delivered`, while `returned_total` separately sums orders with status `returned`, including returns from the same delivery period. A returned order may therefore be excluded from delivered revenue and subtracted again, understating the finalized commission.
- **Standard:** Financial totals must use consistent, non-overlapping populations and be tested against mixed delivered/returned cases.
- **Recommendation:** Calculate eligible deliveries and returns from a consistent event/history model and test the SQL with both still-delivered and later-returned orders.
- **Suggested command:** Outside Impeccable's UI command scope; correct the database calculation and SQL-level tests directly.

### P2 — Minor

#### [P2] Admin dashboard scope and reporting context are easy to misread
- **Location:** `src/app/dashboard/page.tsx:18-25,48,78-81`; `src/components/dashboard/TeamLeaderDailyBriefCard.tsx:55-95`; `src/components/dashboard/KpiCards.tsx:45-50`; `src/components/dashboard/TopPerformers.tsx:52-62`
- **Category:** Clarity / Information architecture
- **Impact:** Administrators and team leaders receive similar brief framing while the page switches between workspace-wide and team scope. KPI and leaderboard reporting periods are not always visible, so users may compare unlike numbers.
- **Recommendation:** Give the administrator a workspace-specific brief, visually label each metric's scope and time period, and explain domain shorthand.
- **Suggested command:** `/impeccable clarify`, then `/impeccable layout`.

#### [P2] Mixed locale and date formatting slow down operational reading
- **Location:** `src/components/dashboard/TeamLeaderDailyBriefCard.tsx:55-95`; `src/components/dashboard/RecentActivityFeed.tsx:17-22`
- **Category:** Clarity / Accessibility
- **Impact:** Czech-speaking staff encounter English actions and labels alongside Czech explanatory copy; timestamps use `en-US`. Users must translate while working and dates can be ambiguous.
- **Recommendation:** Select the workspace's default locale and apply it consistently to labels, statuses, timestamps, empty/error states, and currency.
- **Suggested command:** `/impeccable clarify`.

#### [P2] Long, flat admin navigation increases scan time
- **Location:** `src/components/layout/navigation.ts`; confirmed in the previously saved local walkthrough as 18 administrator destinations.
- **Category:** Information architecture
- **Impact:** Frequently used call-center work is mixed with setup, reporting, and admin destinations, increasing navigation time.
- **Recommendation:** Group destinations into clear work areas while retaining role visibility and command-palette access.
- **Suggested command:** `/impeccable distill`.

#### [P2] Sidebar touch targets are below a comfortable mobile size
- **Location:** `src/components/layout/Sidebar.tsx:127-156`
- **Category:** Accessibility / Responsive
- **Impact:** Navigation uses `py-2.5` with `text-xs` (roughly 35px high) and the collapse control uses `p-1.5` around a 16px icon (roughly 28px), below the 44px touch-target benchmark.
- **Standard:** WCAG 2.2 target-size guidance; 44×44 CSS px is the recommended comfortable target.
- **Recommendation:** Increase mobile hit areas to at least 44px, even if desktop visual spacing stays compact.
- **Suggested command:** `/impeccable adapt`.

#### [P2] Color tokens are defined but underused
- **Location:** `src/app/globals.css:3-28`; direct utility color classes found across 119 files (2,184 matches in `src`).
- **Category:** Theming / Implementation Integrity
- **Impact:** Repeated literal palette classes make global theme changes and consistency checks harder; there is no evidence of a theme switcher.
- **Recommendation:** Document the incumbent palette and use semantic tokens for repeated surface, text, and state colors; preserve purposeful one-off status colors.
- **Suggested command:** `/impeccable document`.

## Deterministic Detector Results

The full `src` scan exited with status 2 and emitted **16 warnings across six files**:

- **15 `gray-on-color` warnings** in `src/app/training/page.tsx` (lines 263, 344), `src/components/settings/ProductScriptManager.tsx` (466, 475), `src/components/team/TeamQueuePanel.tsx` (175), `src/components/team/UserOnboardingModal.tsx` (184, 200), `src/components/team/UsersHubPanel.tsx` (371), and `src/components/workspace/ProductScriptPanel.tsx` (198).
- **1 `ai-color-palette` warning** in `src/components/team/UsersHubPanel.tsx:193`.
- **Context verification:** the gray-on-color detections are false positives from separate or nested Tailwind classes sharing a long JSX line. For example, light text is paired with deep emerald/amber/rose surfaces, or the amber mark classes are nested separately from the editor's neutral base text. The isolated purple administrator metric is a semantic highlight; the detector cannot establish that it makes the product palette generic. No warning was confirmed as an actual contrast defect.
- The dashboard-only detector scan returned `[]` (exit 0).
- No detector overlay was injected, and no user-visible overlay is available.

## Patterns and Positive Findings

- **Systemic:** language and locale consistency, small secondary text/hit areas, and palette utility classes recur across the UI.
- **Working well:** role-aware dashboard scope and redirects; direct actions to add a lead and launch the operator console; honest disclosure of pilot limitations; explicit separation between training and live work; responsive dashboard layout and mobile sidebar logic; shared dark-theme tokens.
- Performance was not instrumented. Source inspection alone does not prove that the application meets runtime performance targets.

## Persona Red Flags

- **Administrator:** the dashboard's workspace-wide wallet alongside team-scoped measures can make scope unclear; reporting periods are not always visible.
- **Team leader:** mixed Czech/English labels and a flat 18-destination menu slow down finding daily work.
- **Operations manager:** leaderboard and activity panels need visible reporting periods and clear date localization before numbers can be compared confidently.

## Minor Observations

- The dashboard calls its supporting area “Team performance and activity” even when the administrator sees workspace-wide scope.
- The unavailable call activity panel is candid but visually substantial; a compact status with a link would preserve honesty while reducing dead space.
- `prefers-reduced-motion`/`motion-reduce` appears only three times in two files (`ProductCard.tsx`, `ProductOrderPanel.tsx`), so animation alternatives are not systematic across the application.

## Questions to Consider

- Should administrators see a workspace brief, a team-leader brief, or both?
- Which timeframe should KPI cards and the leaderboard use?
- Should Czech be the default workspace language?
- Should unavailable analytics remain full-size in the pilot?

## Recommended Actions

1. **[P1]** Fix webhook fail-open authentication and privileged RPC authorization in the server/database code; verify with negative authorization tests.
2. **[P1]** Correct monthly commission population logic and add mixed delivery/return SQL tests.
3. **[P2]** `/impeccable clarify` — unify Czech/English copy, timestamps, scope labels, and reporting periods.
4. **[P2]** `/impeccable adapt` — raise mobile sidebar hit areas to at least 44px.
5. **[P2]** `/impeccable distill` — group the long flat administrator navigation.
6. **[P2]** `/impeccable document` — capture and standardize the current color-token system.
7. **[P2]** `/impeccable polish` — final pass after the above changes.

## Not Verified

- Live production app navigation, data, and account creation.
- Actual browser rendering at 1920×1080 or at mobile breakpoints.
- Production presence/value of `CARRIER_WEBHOOK_SECRET` and whether the reviewed migrations are deployed.
- Runtime performance, measured WCAG color contrast, or end-to-end actions against production records.
- The uncommitted seed change that inserts a synthetic row directly into `auth.users` was not tested against production and should not be run there before review.

## Follow-up: fixes in the current worktree (2026-10-08)

The following source-level findings have been addressed in this worktree. None of these changes has been deployed or applied to the production database.

- The carrier webhook now rejects requests with HTTP 503 when its secret is missing and HTTP 401 for an invalid secret, before creating the privileged Supabase client.
- A forward migration adds team authorization inside `record_order_tracking_event`, limits team-leader commission settlement to operators in their active teams, keeps workspace administrators and `service_role` workspace-wide, and counts returned orders consistently in the gross and returned totals.
- The settlement preview now uses the same delivered/returned order population. Regression tests cover a delivery returned in the same period and exclusion of other operators and periods. Previously finalized wallet transactions are not rewritten; any historical reconciliation requires an auditable adjustment.
- Catalog seeding no longer inserts a synthetic `auth.users` row or grants it administrator access. It stops with a clear error unless the workspace already has a real Auth-backed administrator.
- The Playwright smoke test now fails its process for failed interactions, runs at 1920×1080, identifies itself as development/demo-auth only, and shuts down the directly spawned Next.js process.
- Dashboard, daily brief, analytics cards, activity feed, and navigation copy have been localized to Czech; scopes and periods are clearer, sidebar destinations are grouped, touch targets are larger, and unavailable data offers retry where appropriate.
- Next.js and `eslint-config-next` are aligned on 16.4.0; production dependency audit reports zero vulnerabilities. A scoped override updates Telnyx's transitive `uuid` packages to 11.1.1.

### Verification and remaining limits

- `npm test`: 824 tests passed. `npm run check`: ESLint, TypeScript, and production build passed. `npm run verify:migrations`: no structural errors or warnings.
- `npm audit --omit=dev`: zero vulnerabilities. Full `npm audit` still reports five high-severity findings in the development-only Next ESLint dependency chain (`fast-glob` → `micromatch` → `braces`). The registry exposes no patched `braces` 3.x release; npm proposes downgrading the Next ESLint configuration to 14.2.35, which was not accepted because it would mismatch Next.js 16.
- The local Supabase database could not be started because Docker Desktop is unavailable. The 1920×1080 smoke run therefore reached only 1/21 routes and 0/4 interactions successfully; requests requiring the local database returned errors or timed out. Its nonzero exit is expected and confirms failures are no longer masked. Database-level authorization behavior has not been executed locally.
- The production app, deployed migration history, webhook secret configuration, real records, and browser rendering at 1920×1080 remain unverified. No production data or configuration was changed.
