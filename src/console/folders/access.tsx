import { type ManagedFolder } from "@/shared/console/folders/types"
import { VisibilityDialog } from "../shared/visibility/dialog"

/** Access settings for one folder, raised from its menus. The folder's
 *  visibility cascades over everything filed inside it, so this is where a
 *  subtree's audience is set. */
export function FolderAccessDialog({
  folder,
  isOpen,
  onOpenChange,
  organizationId,
}: {
  folder: ManagedFolder | undefined
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}) {
  if (folder === undefined) {
    return null
  }

  return (
    <VisibilityDialog
      noun="folder"
      onOpenChange={onOpenChange}
      open={isOpen}
      organizationId={organizationId}
      ownerId={folder.createdBy}
      target={{ kind: "folder", id: folder.folderId }}
      value={folder.visibility}
    />
  )
}
