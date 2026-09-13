import {
  type FolderDialogRequest,
  folderSubject,
  type ManagedFolder,
} from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { FolderAccessDialog } from "./access"
import { DeleteFolder } from "./delete/dialog"
import { MoveToFolderDialog } from "./move"

// The folder lifecycle dialogs, shared by the sidebar tree and the folder
// page. One request value drives them all, so each caller renders a single
// <FolderDialogs> and hands rows a way to raise requests.

export function FolderDialogs({
  dialog,
  onClose,
  onDeleted,
  organizationId,
}: {
  dialog: FolderDialogRequest | undefined
  onClose: () => void
  /** Ran after a delete lands, e.g. to leave the deleted folder's page. */
  onDeleted: (folder: ManagedFolder) => void
  organizationId: string
}) {
  const remove = useRetained(dialog?.type === "delete" ? dialog : undefined)
  const access = useRetained(dialog?.type === "access" ? dialog : undefined)

  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <MoveToFolderDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        subject={
          dialog?.type === "move" ? folderSubject(dialog.folder) : undefined
        }
      />
      <DeleteFolder
        folder={remove?.folder}
        isOpen={dialog?.type === "delete"}
        onDeleted={onDeleted}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
      <FolderAccessDialog
        folder={access?.folder}
        isOpen={dialog?.type === "access"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
    </>
  )
}
