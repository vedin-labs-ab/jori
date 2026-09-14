import { type ReactNode, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { menuWidth, RowMenuTrigger, TitleMenuContent } from "../../menu"
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
 *  owns the trigger, so this publishes the content only. A page whose
 *  own tools live here too hands them in as the lead, ahead of the
 *  actions every material shares. */
export function MaterialTitleMenu({
  lead,
  ...props
}: MaterialMenuProps & { lead: ReactNode }) {
  const confirm = useRemoveConfirmation(props)

  return (
    <>
      <TitleMenuContent lead={lead}>
        <MaterialMenuItems {...props} onRemove={confirm.request} />
      </TitleMenuContent>
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
        <RowMenuTrigger name={props.material.name} />
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
