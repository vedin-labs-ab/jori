import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Flush controls sit on the text grid of what surrounds them: no horizontal
// padding at rest, so the label lines up with static siblings, and
// hovering, focusing, or opening grows the padding back so the ghost
// surface starts where the label stood. The button base's transition-all
// animates the shift.

/** A stock ghost button that is flush at rest: list headers and a table's
 *  trailing action. The breadcrumb trigger makes the same move at its own,
 *  tighter padding. */
export const flushButtonClassName =
  "px-0 hover:px-2 focus-visible:px-2 aria-expanded:px-2"

/** A full-width row action that is flush at rest and eases its content
 *  inward on hover, exposing the button surface without escaping the
 *  parent's bounds. */
export function flushRowClassName(className?: string) {
  return cn(
    buttonVariants({ variant: "ghost" }),
    "h-auto w-full justify-start px-0 shadow-none hover:px-2 active:not-aria-[haspopup]:translate-y-0 active:not-aria-[haspopup]:shadow-none",
    className
  )
}
