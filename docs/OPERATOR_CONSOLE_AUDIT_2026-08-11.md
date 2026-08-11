# Operator Console combined UX and accessibility audit

**Date:** 2026-08-11
**Surface:** `/workspace`
**User task:** select a lead, start a call, work during the call, end it, and continue to the next operator action
**Capture:** authenticated Playwright session against the local pilot app

## Evidence captured

1. [Ready state](../output/playwright/operator-console-01-ready.png)
2. [In-call state](../output/playwright/operator-console-02-in-call.png)
3. [Post-call state](../output/playwright/operator-console-03-post-call.png)

## Audit scope

This audit covers the visible Operator Console workflow from a ready state
through an active simulated call and back to the ready state. It evaluates task
entry, hierarchy, interaction clarity, trust signals, state communication and
visible accessibility risks. It does not claim full WCAG conformance.

## User goal and accessibility target

The operator should be able to identify the active customer, start or end a
call, understand the current call state, use the relevant customer context,
complete a post-call action, and recover from errors without guessing.

## Step-by-step findings

### 1. Ready state — [operator-console-01-ready.png](../output/playwright/operator-console-01-ready.png)

**What works**

- The active lead, phone number, pipeline value and primary call action are
  visible without navigating away.
- `Ready For Calls`, `Production DB` and `Presence unavailable` provide useful
  system-state signals.
- The three-column structure exposes customer context, copilot context and
  checkout in one workspace.

**Risks**

- The viewport opens partway down the overall information hierarchy: the top
  call bar is visible, but the lower customer and copilot sections continue
  below the fold. The operator must scan a large amount of dense content before
  reaching lower-priority details.
- The main task has competing primary actions: `Call Client`, `Success / Order`,
  `Place Order` and `Send SMS Pay-Link`. It is not immediately clear which one
  ends the call, which one records the outcome, and which one creates the order.
- The middle column presents `Gemini Flash`, a live sentiment heatmap,
  compliance status and objection scoring with high confidence language. The
  screen does not visibly distinguish live integrations from simulated or
  fixture-backed signals.
- The lead is a test record (`Playwright Test Lead`) and the timeline already
  contains previous activity. That is useful for verification, but the product
  surface gives no visible indication that this is pilot/test data.

**Accessibility risks**

- Many secondary labels and metadata use small, low-emphasis text on a dark
  background. Contrast should be measured rather than assumed from the visual
  capture.
- Several compact icon-only controls do not expose their purpose in the visual
  surface; their accessible names and keyboard focus behavior require DOM and
  keyboard verification.

### 2. In-call state — [operator-console-02-in-call.png](../output/playwright/operator-console-02-in-call.png)

**What works**

- `In Call` is clearly marked in the status control and the end-call action is
  the strongest visual action.
- Mute and Hold are placed next to the end-call action, matching the expected
  call-control grouping.
- Customer and product context remain visible while the call is active.

**Risks**

- The active call state still displays the full checkout and AI surfaces with
  nearly equal visual weight. During a live call, this increases the chance of
  accidental checkout interaction or attention drift.
- `Success / Order` remains available while the call is active, while the
  right-side `Place Order` action is also available. The relationship between
  call outcome and order creation is not explicit enough.
- The live-call indicators (`WebRTC Live`, timer, audio bars and speech
  recognition) are visually convincing, but the user is not told which are
  simulated in the pilot. This is a trust risk for an internal operator.

**Accessibility risks**

- The red end-call button communicates urgency visually, but the state change
  also needs a non-color announcement and a reliable focus target after the
  call ends.
- The compact top controls appear easy to click with a mouse, but keyboard
  order and focus visibility were not verified in this pass.

### 3. Post-call state — [operator-console-03-post-call.png](../output/playwright/operator-console-03-post-call.png)

**What works**

- The console returns to `Ready For Calls` and restores the primary call action.
- The customer, product and outcome areas remain available for follow-up.

**Risks**

- The post-call transition does not present a strong, dedicated completion
  summary in the captured viewport. The operator must infer completion from the
  status returning to ready and from the timeline lower in the page.
- The next action is not strongly framed: call the next lead, record notes,
  place an order, and schedule follow-up all remain available without a clear
  recommended sequence.
- The timeline is a long vertical feed inside an already dense page. Newly
  created activity can be hard to notice without an explicit confirmation or
  focused summary.

## Strengths

- The primary operator workflow is reachable from one screen.
- Supabase-backed customer and product data are visible in the live pilot path.
- Call state transitions are visually distinct and the end-call action is
  discoverable.
- The product is honest about operator presence being unavailable.
- The layout has a useful foundation for a focused operator workspace; the
  problem is prioritization and state framing, not a lack of raw capability.

## Highest-priority opportunities

### P0 — Define one authoritative call-state and outcome path

Make the relationship explicit:

```text
Call state → call outcome → optional order creation → post-call summary → next lead
```

There should be one clear primary action at each stage. `Success / Order` and
`Place Order` should not compete without a clear dependency between them.

### P0 — Label simulated versus live signals

Add a consistent, visible distinction for simulated WebRTC/audio/speech/AI and
real Supabase-backed data. This is essential for operator trust and prevents
the pilot UI from implying integrations that do not yet exist.

### P1 — Rebuild the visual hierarchy around the call

Keep call controls and active customer identity at the top. During an active
call, reduce or collapse checkout and secondary analytics. Make the current
recommended action persistent and obvious.

### P1 — Add a dedicated post-call summary state

After ending a call, show a compact confirmation containing outcome, duration,
workflow result, notes/order status and the next recommended action. Focus the
operator on that summary before returning them to the next lead.

### P1 — Verify keyboard and screen-reader behavior

Test focus order, accessible names for icon controls, live-region announcements
for call-state changes, error recovery, and keyboard operation of all selects,
buttons and checkout controls.

### P2 — Reduce dense secondary content

Move timeline, detailed AI evidence, compliance explanation and lower-priority
customer metadata behind progressive disclosure. Preserve fast access without
making every detail compete with the call.

## Evidence limits

- This was a desktop viewport audit at the current local browser size.
- Screenshots cannot confirm exact contrast ratios, screen-reader output,
  keyboard focus order, zoom behavior or responsive layouts.
- The audit did not evaluate telephony quality, AI answer correctness, or
  external webhook/email delivery.
- The audit observed the current pilot/test data state; production data variety
  may expose additional wrapping and empty-state issues.

## Recommended next implementation boundary

Create a separate approved plan for Operator Console stabilization with this
order:

1. establish the call-state/outcome/order state machine in the UI;
2. add explicit live-versus-simulated labels;
3. introduce the post-call summary state;
4. reduce active-call visual competition;
5. verify keyboard/focus/live-region behavior;
6. rerun the same Playwright flow and Supabase persistence checks.

This should remain a focused UX/state-stabilization commit. Telephony and AI
integration work should remain separate.

## Implementation checkpoint — 2026-08-11

The recommended stabilization was implemented in the workspace flow:

- outcome controls are available only during an active call;
- `Success / Order` explicitly unlocks order creation;
- placing an order completes the call with `order_placed` and shows a dedicated
  post-call summary;
- the summary exposes outcome, order status, automation visibility and the
  next-lead action;
- simulated telephony, speech/AI and compliance signals are labelled as pilot
  or preview states, while the Supabase-backed lead/product path remains live;
- mute and hold controls have accessible names, and the notification region is
  announced politely to assistive technology.

Verification completed after implementation:

- Playwright authenticated flow: ready → active call → `Success / Order` →
  unlocked `Place Order` → `Post-call summary` → `Continue to next lead`;
- Supabase persistence: the latest call for `Playwright Test Lead` has outcome
  `order_placed` and duration `145` seconds;
- Supabase persistence: the latest order for the same lead is `completed` for
  `Playwright Test Product` with total `129.50`;
- `npm run typecheck` and `npm run build` pass;
- the full lint baseline remains noisy and the targeted lint invocation was
  interrupted, so lint is not claimed as a clean verification in this slice.

The verification intentionally used the existing mock/test lead and product.
The created order is retained as test data; no production or personal data was
introduced.
