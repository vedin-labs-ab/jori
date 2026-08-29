import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"

/** Name-cell shell shared by the material list tables: the kind icon, the
 *  caller's link and badges, and an optional description subline.
 *
 *  The width cap lives on this inner block, not the table cell — browsers
 *  ignore max-width on table cells when sizing auto-layout columns, so only
 *  an inner cap keeps a long unbroken name from widening the column. The
 *  `min-w-0` row then lets the caller's `truncate` link ellipsize inside it. */
export function MaterialNameCell({
  children,
  description,
  icon: Icon,
}: {
  /** The truncating name link, followed by any badges. */
  children: ReactNode
  description?: string
  icon: LucideIcon
}) {
  return (
    <div className="grid max-w-64 gap-0.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {children}
      </div>
      {description === undefined ? null : (
        <p className="truncate pl-6 text-muted-foreground" title={description}>
          {description}
        </p>
      )}
    </div>
  )
}

/** The class a material name link wears inside `MaterialNameCell`: it is the
 *  one flex item allowed to shrink, ellipsizing instead of overflowing. */
export const materialNameLinkClassName = "truncate font-medium hover:underline"
