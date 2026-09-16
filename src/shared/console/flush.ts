import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A full-width row action that sits flush with static siblings at rest and
// eases its content inward on hover, exposing the button surface without
// escaping the parent's bounds: the Button's flush variant, minus its
// held-open state, since an expanded section rests open rather than
// holding a menu.
export function flushRowClassName(className?: string) {
  return cn(
    buttonVariants({ variant: "ghost" }),
    "h-auto w-full justify-start px-0 shadow-none hover:px-2 active:not-aria-[haspopup]:translate-y-0 active:not-aria-[haspopup]:shadow-none",
    className
  )
}
