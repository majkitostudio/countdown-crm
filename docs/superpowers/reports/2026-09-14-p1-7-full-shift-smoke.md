# P1.7 full-shift browser smoke — 14. 9. 2026

## Scope

Authenticated browser smoke of the linked sandbox using isolated disposable
Administrator, Team Leader and Operator identities in one workspace. The test
uses one clearly labelled lead assignment and one append-only operator note.
No credentials or personal customer data are recorded here.

## Confirmed behavior

| Role | Verified behavior |
| --- | --- |
| Administrator | Direct Dashboard, Workspace Members and Settings access; reload retained the authenticated workspace; Control Checkpoint exposed truthful ready, attention and blocked states. |
| Team Leader | Defaulted to Exception Queue, retained its data on reload, opened queue operations and saw the assigned test operator. Direct `/readiness` access was correctly unavailable. |
| Operator | Defaulted to its assigned customer, expanded the Product Script, opened the read-only profile in a new tab, added a note, reloaded and saw the persisted note again. Direct URLs for another operator's lead and for `/readiness` were correctly rejected. |

The note write was read back directly from the linked database with the test
operator as author. The test queue item was then closed; the append-only note
remains as audit evidence.

## Finding and correction

The first operator note attempt exposed two related authorization defects:

1. Server code re-read `leads` after `getScopedLeadForWorkspace` had already
   verified the current assignment. Operator RLS intentionally denies that
   second directory lookup.
2. The `lead_notes` INSERT policy also used a direct `leads` subquery, so its
   RLS evaluation denied the otherwise authorised operator write.

The application now uses the completed assignment guard for operators, and
the linked migration `20260913215733_allow_operator_notes_for_current_assignment`
uses a private, role-aware check. It permits an operator only for their own
`assigned`, `in_progress` or `awaiting_outcome` queue item; Team Leaders and
Administrators retain their current-workspace scope. The policy still requires
the inserted `author_id` to equal `auth.uid()`.

## Evidence limits

This is a linked-sandbox browser and SQL read-back proof. Docker Desktop was
not available after the workstation restart, so local pgTAP was not rerun in
this session. The code-level regression tests and the linked policy catalog
check both passed. This smoke does not represent a live telephone provider,
audio device or external production pilot.
