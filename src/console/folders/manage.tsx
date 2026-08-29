import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { useRetained } from "../shared/retain"
import { MoveToFolderDialog } from "./move"
import { type FolderRow } from "./types"

// The folder lifecycle dialogs, shared by the sidebar tree and the folder
// page. One request value drives them all, so each caller renders a single
// <FolderDialogs> and hands rows a way to raise requests.

export type FolderDialogRequest =
  | { type: "create"; parentId?: string }
  | { type: "delete"; folder: FolderRow }
  | { type: "move"; folder: FolderRow }
  | { type: "rename"; folder: FolderRow }

export function FolderDialogs({
  dialog,
  onClose,
  onDeleted,
  organizationId,
}: {
  dialog: FolderDialogRequest | undefined
  onClose: () => void
  /** Ran after a delete lands, e.g. to leave the deleted folder's page. */
  onDeleted?: (folder: FolderRow) => void
  organizationId: string
}) {
  const create = useRetained(dialog?.type === "create" ? dialog : undefined)
  const rename = useRetained(dialog?.type === "rename" ? dialog : undefined)
  const remove = useRetained(dialog?.type === "delete" ? dialog : undefined)

  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

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
          dialog?.type === "move"
            ? {
                kind: "folder",
                folderId: dialog.folder.folderId,
                name: dialog.folder.name,
                parentId: dialog.folder.parentId,
              }
            : undefined
        }
      />
      <DeleteFolderDialog
        folder={remove?.folder}
        isOpen={dialog?.type === "delete"}
        onDeleted={onDeleted}
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
      />
    </>
  )
}

export function CreateFolderDialog({
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
  folder: FolderRow | undefined
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

function DeleteFolderDialog({
  folder,
  isOpen,
  onDeleted,
  onOpenChange,
  organizationId,
}: {
  folder: FolderRow | undefined
  isOpen: boolean
  onDeleted: ((folder: FolderRow) => void) | undefined
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const remove = useMutation(api.folders.console.remove)
  const [isDeleting, setIsDeleting] = useState(false)

  if (folder === undefined) {
    return null
  }

  async function submit(target: FolderRow) {
    setIsDeleting(true)

    try {
      await remove({ organizationId, folderId: target.folderId })
      toast.success(`Deleted ${target.name}.`)
      onOpenChange(false)
      onDeleted?.(target)
    } catch (error) {
      showErrorToast(error, "Could not delete the folder.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{folder.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing inside is deleted: its subfolders and filed items move to
            the parent folder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={() => void submit(folder)}
            variant="destructive"
          >
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Name-only form shared by create and rename; the name is validated on
 *  submit, like the other material dialogs. */
function FolderNameDialog({
  initialName,
  isOpen,
  onOpenChange,
  onSubmit,
  submitLabel,
  title,
}: {
  initialName: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (name: string) => Promise<void>
  submitLabel: string
  title: string
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  async function submit() {
    if (name.trim() === "") {
      setError("Name is required.")

      return
    }

    setIsSaving(true)

    try {
      await onSubmit(name.trim())
      setName(initialName)
      onOpenChange(false)
    } catch (submitError) {
      showErrorToast(submitError, "Could not save the folder.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            aria-invalid={error === undefined ? undefined : true}
            id="folder-name"
            onChange={(event) => {
              setName(event.target.value)
              setError(undefined)
            }}
            value={name}
          />
          {error === undefined ? null : (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => void submit()}
            type="button"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
