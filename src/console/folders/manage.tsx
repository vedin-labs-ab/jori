import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { toast } from "sonner"
import { FolderNameDialog } from "@/shared/console/folders/dialogs/name"
import {
  type FolderDialogRequest,
  folderSubject,
  type ManagedFolder,
} from "@/shared/console/folders/types"
import { closeOnDismiss, useRetained } from "@/shared/console/retain"
import { api } from "../../../convex/_generated/api"
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
  const create = useRetained(dialog?.type === "create" ? dialog : undefined)
  const rename = useRetained(dialog?.type === "rename" ? dialog : undefined)
  const remove = useRetained(dialog?.type === "delete" ? dialog : undefined)
  const access = useRetained(dialog?.type === "access" ? dialog : undefined)

  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <CreateFolderDialog
        isOpen={dialog?.type === "create"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        parentId={create?.parentId}
      />
      <RenameFolderDialog
        folder={rename?.folder}
        isOpen={dialog?.type === "rename"}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
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

function CreateFolderDialog({
  isOpen,
  onOpenChange,
  organizationId,
  parentId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  parentId?: string
}) {
  const create = useMutation(api.folders.console.create)

  return (
    <FolderNameDialog
      initialName=""
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={async (name) => {
        await create({
          organizationId,
          name,
          parentId: parentId as GenericId<"folders"> | undefined,
        })
        toast.success(`Created ${name}.`)
      }}
      submitLabel="Create folder"
      title="New folder"
    />
  )
}

function RenameFolderDialog({
  folder,
  isOpen,
  onOpenChange,
  organizationId,
}: {
  folder: ManagedFolder | undefined
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const update = useMutation(api.folders.console.update)

  if (folder === undefined) {
    return null
  }

  return (
    <FolderNameDialog
      initialName={folder.name}
      isOpen={isOpen}
      key={`${folder.folderId}:${folder.name}`}
      onOpenChange={onOpenChange}
      onSubmit={async (name) => {
        await update({ organizationId, folderId: folder.folderId, name })
        toast.success(`Renamed to ${name}.`)
      }}
      submitLabel="Rename"
      title={`Rename "${folder.name}"`}
    />
  )
}
