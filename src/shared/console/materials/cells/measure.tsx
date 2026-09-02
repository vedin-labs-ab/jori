import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** A counted column: a muted icon, the figure, and the spelled-out label
 *  for screen readers and the tooltip. */
export function MaterialMeasureCell({
  className,
  icon: Icon,
  label,
  value,
}: {
  className?: string
  icon: LucideIcon
  label: string
  value: string | number
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-muted-foreground",
        className
      )}
      title={label}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {value}
      <span className="sr-only">{label}</span>
    </div>
  )
}
