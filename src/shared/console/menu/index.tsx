import { MoreHorizontal } from "lucide-react"
import { type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** One width for every console dropdown menu. The widest label any of them
 *  carries — "Remove from folder" — sets it, so nothing wraps and the same
 *  item lands in the same place wherever the menu was opened from. */
export const menuWidth = "w-48"

/** Breadcrumb menus share their alignment, width, and lead divider. */
export function TitleMenuContent({
  children,
  lead,
  ...props
}: Pick<ComponentProps<typeof DropdownMenuContent>, "onCloseAutoFocus"> & {
  children: ReactNode
  lead?: ReactNode
}) {
  return (
    <DropdownMenuContent align="start" className={menuWidth} {...props}>
      {lead === undefined || lead === null ? null : (
        <>
          {lead}
          <DropdownMenuSeparator />
        </>
      )}
      {children}
    </DropdownMenuContent>
  )
}

/** The "…" button a list row opens its menu from, named for the row so
 *  screen readers tell one row's actions from another's. */
export function RowMenuTrigger({
  name,
  disabled = false,
}: {
  name: string
  disabled?: boolean
}) {
  const button = (
    <Button
      disabled={disabled}
      aria-label={`Open actions for ${name}`}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <MoreHorizontal />
    </Button>
  )
  return disabled ? (
    button
  ) : (
    <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
  )
}
