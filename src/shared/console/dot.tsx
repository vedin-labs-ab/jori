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
 * Suffix arrow that slides in when the nearest `group/reveal` parent is
 * hovered or focused. The parent supplies the layout (inline-flex, gap).
 */
export function RevealArrow({ className }: { className?: string }) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className={cn(
        "-translate-x-1 size-3 opacity-0 transition-all duration-200 ease-out group-focus-visible/reveal:translate-x-0 group-focus-visible/reveal:opacity-100 group-hover/reveal:translate-x-0 group-hover/reveal:opacity-100",
        className
      )}
    />
  )
}
