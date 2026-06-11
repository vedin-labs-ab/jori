import { cn } from "@/lib/utils"

export function SeparatorDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1 shrink-0 rounded-full bg-current", className)}
    />
  )
}
