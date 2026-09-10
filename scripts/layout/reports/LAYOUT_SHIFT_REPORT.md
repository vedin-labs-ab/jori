# Layout stability result

The shortened task implements best effort changes for 32 source causes. The
inventory and findings are complete as an audit record, with unmeasured cases
explicitly marked. The product is not certified free of layout shifts.

The user stopped the extensive verification/fix loop on 2026-09-10. We retained
required repository checks and performed one independent browser pass on the
integrated fixes. No full inventory rerun or second browser fix loop followed.

## Changes

Closing dialogs retain their names, form values and selected panels. Drafts
reset on the next opening. Facet and pagination footers retain their space.
Validation messages, changing labels, clocks and pending icons have reserved
slots. Several loading placeholders now match their loaded content, and a late
Geist response no longer swaps the font on an already painted page.

[All 32 cause fixes and commits](LAYOUT_SHIFT_FIXES.csv) distinguish implemented,
verified representative and partial results. The [findings](LAYOUT_SHIFT_FINDINGS.md)
retain 82 merged groups and 1,318 recorded occurrences, including candidates and
motion questions that were not changed. The findings were presented before UI
fixes began.

## Evidence

The [inventory](LAYOUT_SHIFT_INVENTORY.md) and [profile ledger](LAYOUT_SHIFT_COVERAGE.csv)
record the final measurement cutoff: 2,167 completed reviewed profiles, 592
source-verified exclusions, 257 incomplete and 1,388 not measured, across
1,101 cases and 4,404 baseline profiles. Reviewed frames, completed intended states,
by-design breakpoint exclusions and unmeasured profiles are distinct.
Authentication succeeded, and two isolated signed-in conversations exercised
first send and follow-up completion. Local fixtures cover shared view behavior,
not backend authorization or service timing.

The focused after pass covered 35 profiles and 207 original PNGs using unchanged
V3 measurement code. Reviewers checked
fixes written by another agent. Per-frame evidence, native entries and remaining
movement are recorded in [root review](AFTER_ROOT_REVIEW.json),
[chat review of lists](AFTER_CHAT_REVIEW.md) and
[controls review of shell](AFTER_CONTROLS_REVIEW.md). Native totals include
recent-input events and requested changes; a nonzero total is not automatically
an unintended shift, and a zero total is not enough to declare a visual pass.

Verified representatives include rename/create/row/column draft retention,
Settings Billing exit, schema exit, facet and pager slots, attachment search,
mention insertion, context removal, single-error validation and receipt loading.
The model tier control keeps its outer width, but its centered icon still moves
about 0.84px. The signed-in home arrival did not expose every intermediate state
in screenshots, so Recent and composer readiness fixes remain only partially
verified by this pass.

## Remaining work

- Automatic table widths still redistribute after filtering, insertion and
  renaming. This can move menu anchors and push a narrow column out of view.
- Late sidebar Recent data still inserts a group. Activity lane counts and
  personal integration headline wrapping remain variable.
- Some streaming scroll behavior, late breadcrumbs, organization profile
  loading and editor syntax-highlighting flashes remain open.
- Long custom model labels, multiline validation errors and unusually wrapped
  receipt headers need separate responsive review. Content can still grow.
- Requested collection/disclosure changes, hover padding, focus-driven grid
  scrolling and confirmation owner unmounting remain motion questions.
- Old warm fragment captures, incomplete intended states, failed recipes and
  unmeasured supplemental fixtures are coverage gaps. They are not passes.

## Validation and maintenance

The initial integrated check passed build, typecheck, content, dependencies,
structure, versions and entrypoint checks. Scenario JSON formatting was then
corrected. The first full test run passed 3,217 tests and rejected one new
recorder file because it used Node's test import under Vitest. That import was
corrected and its five tests passed. The final landing runs `pnpm check` and
`pnpm test` on the committed tree; completion requires both gates to pass.

[Layout conventions](../../../docs/layout.md) and the
[recorder instructions](../README.md) describe the shared rules and repeatable
commands. Raw screenshots and traces remain under the ignored
`/Users/albin/Code/jori/dist/layout-hunt` directory because signed-in captures can
contain development data. Auth session files remain ignored. No production
shipment was requested or performed.
