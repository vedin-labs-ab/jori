import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A full-width row action that sits flush with static siblings at rest and
// eases its content inward on hover, exposing the button surface without
// escaping the parent's bounds (px-0 at rest, padded on hover; the button
// base's transition-all animates the shift).
export function flushRowClassName(className?: string) {
  return cn(
    buttonVariants({ variant: "ghost" }),
    "h-auto w-full justify-start px-0 shadow-none hover:px-2 active:not-aria-[haspopup]:translate-y-0 active:not-aria-[haspopup]:shadow-none",
    className
  )
}
