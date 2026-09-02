import {
  FolderInput,
  FolderMinus,
  Loader2,
  LockKeyhole,
  Pencil,
  RotateCcw,
} from "lucide-react"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { type MaterialActionTarget, RemoveMenuItem } from "./confirm"

// The canonical menu for a table or a store, as items only. Every surface
// that offers one — the detail page's breadcrumb, the material's own list
// row, a folder listing's row — composes exactly this inside its own
// trigger, so the same material offers the same actions everywhere.

export type MaterialMenuActions = {
  isDeleting: boolean
  isRestoring: boolean
  material: MaterialActionTarget
  onAccess: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  onRestore: () => void
  /** Folder listings only: leaving a folder acts on the filing, not on the
   *  material, so it belongs where the filing is on show. */
  onUnfile?: () => void
}

export function MaterialMenuItems({
  isDeleting,
  isRestoring,
  material,
  onAccess,
  onEdit,
  onMoveToFolder,
  onRemove,
  onRestore,
  onUnfile,
}: MaterialMenuActions & { onRemove: () => void }) {
  const isArchived = material.archivedAt !== undefined
  const isPending = isDeleting || isRestoring

  return (
    <>
      <DropdownMenuItem disabled={isPending} onSelect={onEdit}>
        <Pencil />
        Edit details
      </DropdownMenuItem>
      <DropdownMenuItem disabled={isPending} onSelect={onAccess}>
        <LockKeyhole />
        Sharing…
      </DropdownMenuItem>
      <DropdownMenuItem disabled={isPending} onSelect={onMoveToFolder}>
        <FolderInput />
        Move to folder…
      </DropdownMenuItem>
      {onUnfile === undefined ? null : (
        <DropdownMenuItem disabled={isPending} onSelect={onUnfile}>
          <FolderMinus />
          Remove from folder
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {isArchived ? (
        <DropdownMenuItem disabled={isPending} onSelect={onRestore}>
          {isRestoring ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          {isRestoring ? "Restoring" : "Restore"}
        </DropdownMenuItem>
      ) : null}
      <RemoveMenuItem
        isArchived={isArchived}
        isDeleting={isDeleting}
        isPending={isPending}
        onSelect={onRemove}
      />
    </>
  )
}
