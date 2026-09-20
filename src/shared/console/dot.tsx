import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function SeparatorDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1 shrink-0 rounded-full bg-current", className)}
    />
  )
}

/**
 * Suffix arrow that opens when the nearest `group/reveal` parent is hovered
 * or focused. At rest it takes no room at all: its box has no width, and the
 * space that sets it off from the text is its own, so the parent needs no
 * gap for it and grows only as the arrow appears.
 */
export function RevealArrow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex w-0 shrink-0 justify-end overflow-hidden opacity-0 transition-[width,opacity] duration-200 ease-out group-focus-visible/reveal:w-4 group-focus-visible/reveal:opacity-100 group-hover/reveal:w-4 group-hover/reveal:opacity-100 motion-reduce:transition-none",
        className
      )}
    >
      <ArrowUpRight className="size-3 shrink-0" />
    </span>
  )
}
