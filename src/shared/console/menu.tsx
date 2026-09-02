import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

/** One width for every console dropdown menu. The widest label any of them
 *  carries — "Remove from folder" — sets it, so nothing wraps and the same
 *  item lands in the same place wherever the menu was opened from. */
export const menuWidth = "w-48"

/** The "…" button a list row opens its menu from, named for the row so
 *  screen readers tell one row's actions from another's. */
export function RowMenuTrigger({ name }: { name: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        aria-label={`Open actions for ${name}`}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
  )
}
