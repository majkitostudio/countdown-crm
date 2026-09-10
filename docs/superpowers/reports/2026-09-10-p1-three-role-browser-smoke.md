# P1 Three-Role Browser Smoke — local evidence

**Date:** 2026-09-10  
**Environment:** local only (`http://localhost:3000`)  
**Browser runner:** Playwright CLI, three isolated browser sessions  
**Linked/production evidence:** not run — no linked execution authorization was used.

## Scope and safety

- A single disposable local workspace was created for this run with one Operator, one Team Leader, and one Administrator.
- Each role used a separate browser session. No session state was shared between roles.
- The workspace, memberships, and the three local Auth identities were removed after the run. Post-cleanup read-back returned zero remaining records for each category.
- This report deliberately contains role names and outcomes only; it does not include identity addresses, credentials, browser storage, or service keys.

## Verified browser outcomes

| Role | Login and home | Navigation and direct URLs | Reload / logout | Result |
| --- | --- | --- | --- | --- |
| Operator | Redirected to `/workspace` and displayed the Operator Console with an empty, server-controlled assignment state. | Sidebar contained only operator-appropriate routes. Direct `/exceptions`, `/readiness`, and `/analytics` showed explicit permission boundaries. `/calls` showed the verified empty Call History state and its new transcript wording. | Reload retained the authenticated role state. Logout returned to `/login`; a direct `/workspace` visit stayed on login. | Passed |
| Team Leader | Redirected to `/exceptions` and displayed the Team Leader Exception Queue. | Manager navigation and Analytics were available. Empty Exception Queue stated that no placeholder problem was created. Direct `/readiness` showed the Administrator-only boundary. | Reload retained role state; logout returned to `/login`. | Passed |
| Administrator | Redirected to `/readiness` and displayed blocked/attention states instead of a false Ready state. | Administrator navigation included Workspace Members and Readiness. `/team` showed the local workspace members and queue state. Direct `/monitor` showed the deliberate pilot-unavailable message with no fabricated live counts or listening controls. | Reload retained role state; logout returned to `/login`; direct `/readiness` then stayed on login. | Passed |

## Cross-role observations

- Sidebar and command-palette prompts matched the intended role: operator copy did not advertise lead search; manager copies did.
- The new Call History UI distinguished a verified empty list from unavailable data and described transcripts as optional captured evidence.
- Browser console check recorded zero errors for all three isolated sessions.
- The local workspace had no queue, products, orders, or completed calls. This made the empty-state evidence valid, but did not permit a safe UI mutation/read-back for each role. That part of the full working-day smoke remains outstanding rather than being claimed as passed.

## Finding

**Analytics empty-state wording needs one follow-up.** With zero persisted calls, Analytics displays `Call Conversion Rate: 0%` and `Based on 0 total calls`. Mathematically the rate has no denominator, so the more truthful pilot display is `—` / `Unavailable`, consistent with the existing unavailable-source treatment elsewhere.

## Cleanup read-back

| Disposable local resource | Remaining after cleanup |
| --- | ---: |
| Organization | 0 |
| Workspace | 0 |
| Workspace memberships | 0 |
| Auth identities | 0 |

## Conclusion

The role-aware navigation and Call Log truthfulness work passed a real, local browser check. The smoke is intentionally recorded as **partial**: it proves authentication, role separation, direct-route denial, truthful empty/unavailable UI, reload, logout, session isolation, and cleanup. A fixture-backed working-day mutation/read-back remains required before P1.4 can be marked fully complete.
