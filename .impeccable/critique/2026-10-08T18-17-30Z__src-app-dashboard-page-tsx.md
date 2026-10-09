---
target: Countdown CRM admin dashboard and workspace
total_score: 23
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-10-08T18-17-30Z
slug: src-app-dashboard-page-tsx
---
## Project and UI assessment

**Scope:** Authenticated administrator walk-through of 22 routes, local Supabase seed and representative flows. Local-only data; no production Supabase project or real customer data was used.

**Overall readiness:** 6/10. The app has a substantial, coherent operational foundation, and its 173 test files / 817 tests pass. It is still a pilot, not a production-ready call-center system: the local dataset has 3 leads, 6 products and 3 scripts, but no orders or calls; live telephony and operator monitoring explicitly report as unavailable. Five admin-checklist items are Ready, four need attention, and one is blocked.

### Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Loading and unavailable states sometimes lack a timeout or next step; early zero counts appeared before the three seeded leads finished loading. |
| 2 | Match System / Real World | 2/4 | Czech/English mixing and unexplained AOV/P2/P3 terms add interpretation work. |
| 3 | User Control and Freedom | 3/4 | Navigation and filters are usable; undo/recovery is not clear on every flow. |
| 4 | Consistency and Standards | 2/4 | Shared shell helps, but wording and terminology vary between routes. |
| 5 | Error Prevention | 3/4 | Role limits and the training boundary are clear; destructive-action safeguards were not fully exercised. |
| 6 | Recognition Rather Than Recall | 3/4 | Labeled navigation and Ctrl+K help, but the long menu requires scanning. |
| 7 | Flexibility and Efficiency | 3/4 | Saved views, table/Kanban, and search help frequent users; more bulk paths are not evident. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Long, card-heavy dashboard gives secondary and primary information similar visual weight. |
| 9 | Error Recovery | 2/4 | Telephony explains its unavailable state; other loading/data failures do not consistently provide a recovery action. |
| 10 | Help and Documentation | 1/4 | Training is explained well; task-focused guidance for admin and reporting is difficult to find. |
| **Total** |  | **23/40** | **Acceptable; meaningful usability work remains.** |

### Design specificity verdict

The application’s actual call-center roles, lead actions, training boundaries, and honest “no synthetic priorities” messaging are product-specific. The overall dark-card visual language is more generic than the product’s work warrants. The biggest opportunity is to make the next important operator/supervisor action and its readiness unmistakable.

The Impeccable detector reported **7 `gray-on-color` warnings** in `src/app/training/page.tsx` (lines 263 and 344). They appear to be false positives: neutral zinc text shares long JSX lines with amber classes on separate elements. The browser overlay injection succeeded and highlighted 30 items on Dashboard and 12 on Training, including small functional text, possible overflow, nested cards, and an overused-Roboto banner. The overlay is visible in the browser tab titled **[Human] Countdown CRM**.

### Overall impression

A credible CRM pilot with unusually clear boundaries around unconnected features, but an administrator still has to infer what is truly ready. The main risk is not missing breadth; it is trust: the interface can briefly present zeros while its real seeded data is still loading, and it mixes languages and levels of readiness.

### What is working

- **Role-aware shell:** named destinations, visible role, and Ctrl+K search support navigation.
- **Honest pilot boundaries:** read-only labels, “no synthetic priorities,” and explicit unavailable-source messages avoid invented operational data.
- **Safe training flow:** the UI clearly says practice cannot create a real order or work task.

### Priority issues

1. **[P1] Loading and empty data are too easy to confuse.** On Leads, the initial view displayed zero contacts although the local workspace contains three; the correct rows appeared after loading. Dashboard/analytics also have slower-loading panels. **Why it matters:** an administrator may mistake a delay or failed source for an actual empty workspace. **Fix:** show skeletons while loading, then distinct empty/unavailable states with source freshness and a retry/setup action. **Suggested command:** `/impeccable harden`.
2. **[P1] The interface changes language mid-task.** Czech and English appear together in headings, actions, filters, and statuses. Terms such as AOV and P2/P3 are not explained. **Why it matters:** users have to translate while acting and may misread status. **Fix:** choose a default locale and use it consistently, including dates/currency and empty/error states; explain unavoidable domain terms. **Suggested command:** `/impeccable clarify`.
3. **[P1] The administrator menu is a flat list of 18 destinations.** **Why it matters:** frequent work is buried among setup, reporting, and operations. **Fix:** group destinations into clear work areas while retaining role visibility and Ctrl+K. **Suggested command:** `/impeccable distill`.
4. **[P2] Users & Permissions combines user, team, and ownership tasks.** **Why it matters:** unrelated admin jobs compete on one long page. **Fix:** use focused sections or tabs and keep assignment context with its save action. **Suggested command:** `/impeccable layout`.
5. **[P2] Dashboard hierarchy is too even and uses internal shorthand.** The long series of similar cards competes for attention, while “P2/P3” reads like internal implementation language. **Why it matters:** supervisors may not see the one action that matters now. **Fix:** prioritize a clear next action, demote secondary metrics, and replace internal codes with user-facing labels. **Suggested command:** `/impeccable layout`.

### Persona red flags

- **Alex, frequent user:** Ctrl+K helps, but an 18-item flat menu and few obvious bulk paths make repeated navigation slower.
- **Jordan, new administrator:** mixed-language labels and unexplained AOV/P2/P3 terminology make it unclear what to do next.
- **Sam, accessibility-dependent:** many secondary labels are very small and muted; contrast and zoom should be measured. This review did not establish a WCAG contrast failure.

### Minor observations

- “Workspace ready” appears alongside “Live API latency unavailable”; clarify whether the latter is expected in the pilot.
- Telephony and Live Team Monitor are explicitly unavailable in this pilot; their messaging is appropriately honest, not evidence that those integrations work.
- Local seeded data contained three leads, six products, and three scripts, but no orders or calls. Therefore order/call reporting and end-to-end operational outcomes could not be verified from this environment.
- A previous code audit recorded separate unresolved engineering risks around carrier webhook/RPC authorization, team-leader data scoping, commission handling for returns, and a critical Next.js dependency advisory. These need code/security/dependency follow-up; the visual walkthrough does not prove they are fixed.

### Questions to consider

- What should an administrator be able to decide from the first dashboard screen before scrolling?
- Which language should be the default for the workspace?
- Which three destinations deserve top-level navigation, with the rest grouped?
