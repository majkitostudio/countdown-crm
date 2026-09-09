# Integration of historical PR #73

This change brings the useful parts of the historical floating-call-controller work onto current main without restoring its older workspace page or its older public RPC permissions.

- A call session and its server assignment state live in the application shell, so the call controls remain available after navigation away from `/workspace`.
- The workspace synchronizes its authenticated assignment into that shared session. While the workspace is open, assignment heartbeats come from the shared session; on another page they continue there.
- The existing workspace interface, current telephony adapter support, Conversation Brief, callback inbox and retry behavior remain in place.
- The post-call migration accepts an `awaiting_outcome` assignment in the legacy helper that the hardened idempotent completion boundary calls internally. It does not grant browser users access to that legacy helper.
- The timer continues while a call is on hold.

## Verification boundary

Typecheck, lint, production build and an independent code review are used for this integration. No test suite is run, at the user's request. The migration is committed for deployment but has not been applied to a database during this integration.
