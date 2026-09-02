import { Archive, Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

/** What the archive/restore/delete lifecycle needs to know about a
 *  material: what to call it, and whether it is already archived. */
export type MaterialActionTarget = {
  name: string
  archivedAt: number | undefined
}

/** The one item that removes a material: active ones archive, archived ones
 *  delete for good — and only the permanent step reads as destructive. */
export function RemoveMenuItem({
  isArchived,
  isDeleting,
  isPending,
  onSelect,
}: {
  isArchived: boolean
  isDeleting: boolean
  isPending: boolean
  onSelect: () => void
}) {
  const ActionIcon = isArchived ? Trash2 : Archive
  const label = isArchived ? "Delete" : "Archive"
  const pendingLabel = isArchived ? "Deleting" : "Archiving"

  return (
    <DropdownMenuItem
      disabled={isPending}
      onSelect={onSelect}
      variant={isArchived ? "destructive" : undefined}
    >
      {isDeleting ? <Loader2 className="animate-spin" /> : <ActionIcon />}
      {isDeleting ? pendingLabel : label}
    </DropdownMenuItem>
  )
}

export function ConfirmRemoveDialog({
  deleteDescription,
  isArchived,
  isDeleting,
  material,
  noun,
  onDelete,
  onOpenChange,
  open,
}: {
  deleteDescription: string
  isArchived: boolean
  isDeleting: boolean
  material: MaterialActionTarget
  noun: string
  onDelete: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="wrap-anywhere">
            {isArchived ? "Delete" : "Archive"} "{material.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived
              ? deleteDescription
              : `This removes the ${noun} from the active list and blocks writes until it is restored.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={onDelete}
            variant={isArchived ? "destructive" : "default"}
          >
            {isArchived ? `Delete ${noun}` : `Archive ${noun}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
