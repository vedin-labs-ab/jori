import { useMemo } from "react"
import { DeleteFolderDialog } from "@/shared/console/folders/dialogs/delete"
import { FolderNameDialog } from "@/shared/console/folders/dialogs/name"
import {
  type FolderDialogRequest,
  type ManagedFolder,
} from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { folderImpact, folderMoveSubject } from "../derive/folders"
import { type FolderId } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"
import { DemoMoveDialog } from "./move"
import { DemoVisibilityDialog } from "./visibility"

type DialogProps = {
  dialog: FolderDialogRequest | undefined
  onOpenChange: (open: boolean) => void
}

/** The folder lifecycle dialogs over the workspace, shared by the sidebar
 *  tree and the folder page. One request value drives them all. */
export function DemoFolderDialogs({
  dialog,
  onClose,
  onDeleted,
}: {
  dialog: FolderDialogRequest | undefined
  onClose: () => void
  /** Ran after a delete lands, e.g. to leave the deleted folder's page. */
  onDeleted?: (folder: ManagedFolder) => void
}) {
  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <CreateFolderDialog dialog={dialog} onOpenChange={closeWhenDismissed} />
      <RenameFolderDialog dialog={dialog} onOpenChange={closeWhenDismissed} />
      <DemoMoveDialog
        onOpenChange={closeWhenDismissed}
        subject={
          dialog?.type === "move" ? folderMoveSubject(dialog.folder) : undefined
        }
      />
      <RemoveFolderDialog
        dialog={dialog}
        onDeleted={onDeleted}
        onOpenChange={closeWhenDismissed}
      />
      <FolderVisibilityDialog
        dialog={dialog}
        onOpenChange={closeWhenDismissed}
      />
    </>
  )
}

function CreateFolderDialog({ dialog, onOpenChange }: DialogProps) {
  const { actions } = useDemoWorkspace()
  const create = useRetained(dialog?.type === "create" ? dialog : undefined)

  return (
    <FolderNameDialog
      initialName=""
      isOpen={dialog?.type === "create"}
      onOpenChange={onOpenChange}
      onSubmit={(name) => {
        actions.createFolder(name, create?.parentId as FolderId | undefined)

        return Promise.resolve()
      }}
      submitLabel="Create folder"
      title="New folder"
    />
  )
}

function RenameFolderDialog({ dialog, onOpenChange }: DialogProps) {
  const { actions } = useDemoWorkspace()
  const rename = useRetained(dialog?.type === "rename" ? dialog : undefined)

  if (rename === undefined) {
    return null
  }

  return (
    <FolderNameDialog
      initialName={rename.folder.name}
      isOpen={dialog?.type === "rename"}
      key={`${rename.folder.folderId}:${rename.folder.name}`}
      onOpenChange={onOpenChange}
      onSubmit={(name) => {
        actions.renameFolder(rename.folder.folderId as FolderId, name)

        return Promise.resolve()
      }}
      submitLabel="Rename"
      title={`Rename "${rename.folder.name}"`}
    />
  )
}

function RemoveFolderDialog({
  dialog,
  onDeleted,
  onOpenChange,
}: DialogProps & { onDeleted: ((folder: ManagedFolder) => void) | undefined }) {
  const { actions, state } = useDemoWorkspace()
  const remove = useRetained(dialog?.type === "delete" ? dialog : undefined)
  const impact = useMemo(
    () =>
      remove === undefined
        ? undefined
        : folderImpact(state, remove.folder.folderId),
    [remove, state]
  )

  return (
    <DeleteFolderDialog
      folder={remove?.folder}
      impact={impact}
      isDeleting={false}
      isOpen={dialog?.type === "delete"}
      onDelete={(deleteResources) => {
        if (remove !== undefined) {
          actions.deleteFolder(
            remove.folder.folderId as FolderId,
            deleteResources
          )
          onOpenChange(false)
          onDeleted?.(remove.folder)
        }
      }}
      onOpenChange={onOpenChange}
    />
  )
}

function FolderVisibilityDialog({ dialog, onOpenChange }: DialogProps) {
  const access = useRetained(dialog?.type === "access" ? dialog : undefined)

  if (access === undefined) {
    return null
  }

  return (
    <DemoVisibilityDialog
      noun="folder"
      onOpenChange={onOpenChange}
      open={dialog?.type === "access"}
      target={{ kind: "folder", id: access.folder.folderId }}
      value={access.folder.visibility}
    />
  )
}
