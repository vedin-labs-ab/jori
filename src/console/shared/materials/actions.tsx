import {
  Archive,
  FolderInput,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type MaterialActionTarget = {
  name: string
  archivedAt: number | undefined
}

/** Archive/restore/delete menu shared by material list rows and detail
 *  pages: active materials archive, archived ones restore or delete for
 *  good, and both destructive steps confirm first. */
export function MaterialActions({
  deleteDescription,
  isDeleting,
  isRestoring,
  material,
  noun,
  onDelete,
  onMoveToFolder,
  onRestore,
}: {
  /** What a permanent delete takes with it, shown in the confirm dialog. */
  deleteDescription: string
  isDeleting: boolean
  isRestoring: boolean
  material: MaterialActionTarget
  noun: string
  onDelete: () => void
  /** When given, the menu offers filing the material into a folder. */
  onMoveToFolder?: () => void
  onRestore: () => void
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const isArchived = material.archivedAt !== undefined
  const isPending = isDeleting || isRestoring

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${material.name}`}
            disabled={isPending}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MoreHorizontal />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onMoveToFolder === undefined ? null : (
            <DropdownMenuItem disabled={isPending} onSelect={onMoveToFolder}>
              <FolderInput />
              Move to folder…
            </DropdownMenuItem>
          )}
          {isArchived ? (
            <DropdownMenuItem disabled={isPending} onSelect={onRestore}>
              {isRestoring ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              {isRestoring ? "Restoring" : "Restore"}
            </DropdownMenuItem>
          ) : null}
          <RemoveMenuItem
            isArchived={isArchived}
            isDeleting={isDeleting}
            isPending={isPending}
            onSelect={() => setIsConfirmOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmRemoveDialog
        deleteDescription={deleteDescription}
        isArchived={isArchived}
        isDeleting={isDeleting}
        material={material}
        noun={noun}
        onDelete={onDelete}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
      />
    </>
  )
}

function RemoveMenuItem({
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

function ConfirmRemoveDialog({
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
          <AlertDialogTitle>
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
