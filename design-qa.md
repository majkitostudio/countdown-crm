# Operator Console layout QA

## Comparison target

- Source visual truth: user-provided browser annotation screenshots for Comments 1–7 in the current task; the source screenshots are attached evidence and are not available as a local file path.
- Intended implementation: `http://localhost:3000/workspace`
- Implementation screenshot path: `C:\Users\mikes\.projects\countdown-crm\output\operator-console-layout-2026-08-20\implementation.png`
- Viewport: 1619 × 761 CSS px; implementation screenshot is 1619 × 761 px; device scale was not overridden.
- State: authenticated local Operator Console with the current assigned lead loaded; outbound console idle state.

## Full-view comparison evidence

The current render was captured after applying the seven browser annotations. The top `Ready for Calls` section is removed, call initiation is in `CURRENT LEAD`, lead selection is removed, location is replaced by a truthful `Source unavailable` state, the script badge is `Outgoing`, the old `Ready` badge is removed, and the right rail heading is `Lead Timeline`.

## Focused region comparison evidence

- Lead header: `CURRENT LEAD` now contains the call initiation control and no lead selector.
- Product Script header/body: the `Approved` and `Ready` badges are gone; the script is presented as numbered exact lines.
- Right rail: `Lead Timeline` replaces `Omnichannel Timeline`.

## Findings

- [P1] Lead source value is not available in the current data model.
  Location: `src/components/workspace/OperatorLeadHeader.tsx`.
  Evidence: the UI now reserves the requested source field but renders `Source unavailable`; the current `Lead` type and Supabase `leads` row contain no source property.
  Impact: the layout is correct, but a real `External`, `Sample`, or similar value cannot be shown without a data-model change.
  Fix: add a workspace-scoped lead source field through the approved data path before claiming source display is complete. This was intentionally not added in the layout-only slice.

- [P1] Several existing `approvedBenefits` values are operator instructions rather than word-for-word customer-facing script lines.
  Location: `src/lib/productScripts.ts` and the numbered script list in `ProductScriptPanel.tsx`.
  Evidence: the render currently includes lines such as `Use only benefits and product details maintained in the product record.`
  Impact: the visual structure now supports strict reading, but the underlying script content is not yet a complete approved call transcript.
  Fix: replace the instruction-like values with approved customer-facing sentences and add explicit branch text for objections; this requires product/script-content approval, not a layout-only change.

## Checks completed

- `npm run typecheck` passed.
- `npm run build` passed.
- Targeted ESLint passed with three existing unused-flow warnings in `src/app/workspace/page.tsx` after the top call-status section was removed; no errors.
- `git diff --check` reported no whitespace errors; only normal Git LF/CRLF conversion warnings.

## Scope notes

This slice applies the browser annotations to the Operator Console layout and presentation. Existing project colors and accents were retained. No source data field, Supabase schema, authentication, persistence behavior, telephony integration, or unrelated route was changed.

## Comparison history

- Earlier state: a separate top `Ready for Calls` / lead selector / `Call Client` section, a lead selector in `CURRENT LEAD`, `Prague, CZ`, `Approved`, `Ready`, continuous unnumbered script text, and `Omnichannel Timeline`.
- Fixes applied: removed the separate top section; moved call controls into `CURRENT LEAD`; removed lead selector; replaced location with source placeholder; changed script direction badge to `Outgoing`; removed the script readiness badge; numbered the exact script lines; renamed the timeline.
- Post-fix evidence: implementation screenshot saved at `C:\Users\mikes\.projects\countdown-crm\output\operator-console-layout-2026-08-20\implementation.png`.

## Final result

blocked
