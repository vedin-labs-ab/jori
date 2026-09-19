import {
  FolderInput,
  FolderMinus,
  Loader2,
  LockKeyhole,
  Pencil,
  RotateCcw,
} from "lucide-react"
import { MenuItem, MenuSeparator } from "../../menu/items"
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
      <MaterialCoreItems
        isPending={isPending}
        onAccess={onAccess}
        onEdit={onEdit}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
      {isArchived ? (
        <MenuItem disabled={isPending} onSelect={onRestore}>
          {isRestoring ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          {isRestoring ? "Restoring" : "Restore"}
        </MenuItem>
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

/** The items every material offers before the lifecycle ones, files
 *  included: details, sharing, and filing, then the separator. */
export function MaterialCoreItems({
  isPending,
  onAccess,
  onEdit,
  onMoveToFolder,
  onUnfile,
}: {
  isPending: boolean
  onAccess: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  onUnfile?: () => void
}) {
  return (
    <>
      <MenuItem disabled={isPending} onSelect={onEdit}>
        <Pencil />
        Rename…
      </MenuItem>
      <MaterialFilingItems
        isPending={isPending}
        onAccess={onAccess}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
      <MenuSeparator />
    </>
  )
}

/** Sharing and organization actions used by resource rows and titles. */
export function MaterialFilingItems({
  isPending = false,
  onAccess,
  onMoveToFolder,
  onUnfile,
}: {
  isPending?: boolean
  onAccess: () => void
  onMoveToFolder: () => void
  onUnfile?: () => void
}) {
  return (
    <>
      <MenuItem disabled={isPending} onSelect={onAccess}>
        <LockKeyhole />
        Audience…
      </MenuItem>
      <MenuItem disabled={isPending} onSelect={onMoveToFolder}>
        <FolderInput />
        Move to folder…
      </MenuItem>
      {onUnfile === undefined ? null : (
        <MenuItem disabled={isPending} onSelect={onUnfile}>
          <FolderMinus />
          Remove from folder
        </MenuItem>
      )}
    </>
  )
}
