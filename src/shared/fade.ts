// Scroll fades for capped scroll regions: the shadcn scroll-fade utility
// (shipped via shadcn/tailwind.css) masks a scrollable edge whenever more
// content hides beyond it, so clipped rows read as "more this way". The
// 24px reveal replaces the utility's 96px default so the fade reaches full
// strength within the first row even when the overflow is tiny. Classes
// stay whole string literals so Tailwind's scanner can pick them up.

/** Vertical edge fade for an `overflow-y-auto`/`overflow-auto` container. */
export const scrollFade = "scroll-fade [--scroll-fade-reveal:24px]"

/** Horizontal edge fade for an `overflow-x-auto` container. */
export const scrollFadeX = "scroll-fade-x [--scroll-fade-reveal:24px]"

/** Vertical edge fade for a shadcn ScrollArea, targeting the viewport that
 *  actually scrolls rather than the root the className lands on. */
export const scrollFadeViewport =
  "[&>[data-slot=scroll-area-viewport]]:scroll-fade [&>[data-slot=scroll-area-viewport]]:[--scroll-fade-reveal:24px]"
