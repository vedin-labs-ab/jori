import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { menuWidth } from "../../menu"
import { type MaterialMenuActions, MaterialMenuItems } from "."
import { ConfirmRemoveDialog } from "./confirm"

// Two triggers over one menu: the detail page hangs it off the material's
// name in the breadcrumb, a list row off its "…" button. Both own the
// confirmation the archive and delete steps pass through.

type MaterialMenuProps = MaterialMenuActions & {
  /** What a permanent delete takes with it, shown in the confirm dialog. */
  deleteDescription: string
  noun: string
  onDelete: () => void
}

/** The material's menu for its breadcrumb name on detail pages; the shell
 *  owns the trigger, so this publishes the content only. */
export function MaterialTitleMenu(props: MaterialMenuProps) {
  const confirm = useRemoveConfirmation(props)

  return (
    <>
      <DropdownMenuContent align="start" className={menuWidth}>
        <MaterialMenuItems {...props} onRemove={confirm.request} />
      </DropdownMenuContent>
      {confirm.dialog}
    </>
  )
}

/** The same menu on a list row, trigger and all. */
export function MaterialRowMenu(props: MaterialMenuProps) {
  const confirm = useRemoveConfirmation(props)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${props.material.name}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={menuWidth}>
          <MaterialMenuItems {...props} onRemove={confirm.request} />
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm.dialog}
    </>
  )
}

function useRemoveConfirmation({
  deleteDescription,
  isDeleting,
  material,
  noun,
  onDelete,
}: MaterialMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return {
    request: () => setIsOpen(true),
    dialog: (
      <ConfirmRemoveDialog
        deleteDescription={deleteDescription}
        isArchived={material.archivedAt !== undefined}
        isDeleting={isDeleting}
        material={material}
        noun={noun}
        onDelete={onDelete}
        onOpenChange={setIsOpen}
        open={isOpen}
      />
    ),
  }
}
