# Layout stability

Keep existing controls in place as data, labels and validation change. Native
layout-shift scores omit some visible movement, including recent-input events
and scroll jumps. Review screenshots and element geometry alongside the score.

- Match loading placeholders to the loaded structure at desktop and mobile
  widths. Keep usable content visible during refetch.
- Reserve icon and label slots for pending states. Use `StableLabel` for a known
  set of labels and tabular digits for clocks. Let longer content grow naturally.
- Use `FieldError reserve` where validation appears between existing fields.
  Empty slots stay out of the accessibility tree; real errors remain alerts.
- Retain a closing dialog's displayed data until its exit finishes. Seed or
  clear drafts on the next opening. An unrelated data refresh must not erase
  an edited draft.
- Reserve conditional footer space when adding or removing it would move
  nearby controls. Hidden controls must not remain focusable.
- Keep authored transform and opacity motion. Do not hide instability by
  clipping content, delaying feedback, or adding an animation.

The preloaded Geist font uses `font-display: optional` so a late font response
does not reflow already painted text. A page may keep its fallback font on a
slow first visit.

Use the [layout recorder](../scripts/layout/README.md) for focused regressions.
The [September 2026 report](../scripts/layout/reports/LAYOUT_SHIFT_REPORT.md)
records the measured scope and remaining causes; it is not a product-wide
zero-shift guarantee.
