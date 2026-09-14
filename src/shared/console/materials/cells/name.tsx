import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Leave room for selection, updated time, and actions on narrow lists. */
export const nameCellWidth = "max-w-[min(16rem,50cqw)]"

/** Name-cell shell shared by the material list tables: the kind icon and
 *  the caller's link and badges.
 *
 *  The width cap lives on this inner block, not the table cell — browsers
 *  ignore max-width on table cells when sizing auto-layout columns, so only
 *  an inner cap keeps a long unbroken name from widening the column. The
 *  `min-w-0` row then lets the caller's `truncate` link ellipsize inside it. */
export function MaterialNameCell({
  children,
  icon: Icon,
}: {
  /** The truncating name link, followed by any badges. */
  children: ReactNode
  icon: LucideIcon
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", nameCellWidth)}>
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  )
}

/** The class a material name link wears inside `MaterialNameCell`: it is the
 *  one flex item allowed to shrink, ellipsizing instead of overflowing. */
export const materialNameLinkClassName = "truncate font-medium"
