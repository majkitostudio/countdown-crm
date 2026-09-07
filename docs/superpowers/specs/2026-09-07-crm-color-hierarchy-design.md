# Countdown CRM Color Hierarchy Design

## Goal

Reduce decorative color noise across the CRM while preserving color as a reliable signal for important operational states.

## Rules

- `zinc` is the default for surfaces, labels, icons, links, and ordinary data.
- `emerald` is reserved for confirmed success, readiness, or positive financial polarity.
- `amber` is reserved for attention, pending action, or a user-facing warning.
- `rose` is reserved for errors, destructive actions, blocked states, and active-call risk.
- `sky` is reserved for explicit information or navigation emphasis, not whole-card decoration.
- Call outcomes and operational severity keep their existing semantic color; only saturation and surface opacity may be reduced.

## Scope

The pass targets the shared page header treatment, a reusable Call Outcome tone map, and the most visible workspace/context surfaces: Conversation Brief, Client Profile, callback scheduling, call review affordances, and operator script headings. Existing status mappings in Call Logs, Exception Queue, Workspace Readiness, wallet polarity, live telephony, and training state remain semantic and are not flattened.

## Implementation shape

Use the existing Tailwind classes and shared component patterns. Avoid introducing a new theme dependency or changing data behavior. Convert decorative sky/emerald/amber treatments to zinc or lower-opacity semantic treatments in the scoped components, and keep all user-visible copy and interaction behavior unchanged.

## Verification

Run focused source tests for the scoped color rules, then the full Vitest suite, lint, typecheck, production build, and `git diff --check`. Finish with a local browser pass on representative dashboard, workspace, Call Logs, review, readiness, and settings screens.
