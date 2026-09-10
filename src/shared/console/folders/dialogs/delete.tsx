import { Loader2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StableLabel } from "@/shared/label"
import { type ManagedFolder } from "../types"

// Deleting a folder takes its whole subtree, so the dialog states the size
// of that subtree before it asks. Contents survive by moving up to the
// parent unless the deleting person says otherwise, and anything with
// something inside it asks for the folder's name typed back.

/** What a delete would take with it, and where the survivors land. */
export type FolderImpact = {
  folderCount: number
  parentName: string | null
  resourceCount: number
}

export function DeleteFolderDialog({
  folder,
  impact,
  isDeleting,
  isOpen,
  onDelete,
  onOpenChange,
}: {
  folder: ManagedFolder | undefined
  /** Undefined while the counts are on their way; null for a folder that
   *  is already gone. */
  impact: FolderImpact | null | undefined
  isDeleting: boolean
  isOpen: boolean
  /** Runs the delete, taking the filed resources along when asked to. */
  onDelete: (deleteResources: boolean) => void
  onOpenChange: (isOpen: boolean) => void
}) {
  if (folder === undefined) {
    return null
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={isOpen}>
      <AlertDialogContent>
        {/* Each folder opens its own form, so no choice outlives the
            dialog it was made in. */}
        <DeleteFolderForm
          folder={folder}
          impact={impact}
          isDeleting={isDeleting}
          key={folder.folderId}
          onDelete={onDelete}
        />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteFolderForm({
  folder,
  impact,
  isDeleting,
  onDelete,
}: {
  folder: ManagedFolder
  impact: FolderImpact | null | undefined
  isDeleting: boolean
  onDelete: (deleteResources: boolean) => void
}) {
  const [deleteResources, setDeleteResources] = useState(false)
  const [confirmation, setConfirmation] = useState("")

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="wrap-anywhere">
          Delete "{folder.name}"?
        </AlertDialogTitle>
        <AlertDialogDescription>
          {impact === undefined || impact === null
            ? readingCopy(impact === undefined)
            : describeDelete(folder.name, impact, deleteResources)}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {impact === undefined || impact === null ? null : (
        <DeleteChoices
          confirmation={confirmation}
          deleteResources={deleteResources}
          folder={folder}
          impact={impact}
          isDeleting={isDeleting}
          onConfirmationChange={setConfirmation}
          onDeleteResourcesChange={setDeleteResources}
        />
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={!canDelete({ confirmation, folder, impact, isDeleting })}
          onClick={(event) => {
            // The button owns the closing, so its pending state survives
            // long enough to be seen.
            event.preventDefault()
            onDelete(deleteResources)
          }}
          variant="destructive"
        >
          {isDeleting ? <Loader2 className="animate-spin" /> : null}
          <StableLabel
            alternatives={["Delete folder and contents"]}
            className="justify-items-center"
          >
            {deleteResources ? "Delete folder and contents" : "Delete folder"}
          </StableLabel>
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}

/** The checkbox that decides the contents' fate, and — for a folder holding
 *  anything at all — the name typed back before the button opens. */
function DeleteChoices({
  confirmation,
  deleteResources,
  folder,
  impact,
  isDeleting,
  onConfirmationChange,
  onDeleteResourcesChange,
}: {
  confirmation: string
  deleteResources: boolean
  folder: ManagedFolder
  impact: FolderImpact
  isDeleting: boolean
  onConfirmationChange: (value: string) => void
  onDeleteResourcesChange: (value: boolean) => void
}) {
  if (isEmptyFolder(impact)) {
    return null
  }

  return (
    <div className="grid gap-4">
      {impact.resourceCount === 0 ? null : (
        <div className="flex items-start gap-2">
          <Checkbox
            checked={deleteResources}
            disabled={isDeleting}
            id="delete-folder-contents"
            onCheckedChange={(next) => onDeleteResourcesChange(next === true)}
          />
          <Label
            className="font-normal text-xs"
            htmlFor="delete-folder-contents"
          >
            Also permanently delete the {items(impact.resourceCount).label}{" "}
            inside
          </Label>
        </div>
      )}
      <div className="grid gap-2">
        <Label className="font-normal text-xs" htmlFor="delete-folder-name">
          Type{" "}
          <span className="font-medium text-foreground">{folder.name}</span> to
          confirm
        </Label>
        <Input
          autoComplete="off"
          disabled={isDeleting}
          id="delete-folder-name"
          onChange={(event) => onConfirmationChange(event.target.value)}
          value={confirmation}
        />
      </div>
    </div>
  )
}

/** What the delete takes, in the order it matters: the folders always, then
 *  the contents' fate under the choice standing right now. */
function describeDelete(
  name: string,
  impact: FolderImpact,
  deleteResources: boolean
) {
  const folders =
    impact.folderCount === 0
      ? `This deletes "${name}".`
      : `This deletes "${name}" and its ${subfolders(impact.folderCount)}.`

  if (impact.resourceCount === 0) {
    return `${folders} Nothing is filed inside.`
  }

  const inside = items(impact.resourceCount)

  return deleteResources
    ? `${folders} Its ${inside.label} ${inside.is} deleted for good.`
    : `${folders} Its ${inside.label} ${inside.moves} ${destination(impact)}.`
}

/** Before the counts arrive, and for the folder someone else deleted while
 *  this dialog stood open. */
function readingCopy(isLoading: boolean) {
  return isLoading
    ? "Reading what this folder holds…"
    : "This folder is already gone."
}

/** Nothing to lose, nothing to protect: an empty folder keeps the plain
 *  confirm, with no typing ceremony. */
function isEmptyFolder(impact: FolderImpact) {
  return impact.folderCount === 0 && impact.resourceCount === 0
}

function canDelete(args: {
  confirmation: string
  folder: ManagedFolder
  impact: FolderImpact | null | undefined
  isDeleting: boolean
}) {
  if (args.impact === undefined || args.impact === null || args.isDeleting) {
    return false
  }

  return (
    isEmptyFolder(args.impact) || args.confirmation.trim() === args.folder.name
  )
}

function destination(impact: FolderImpact) {
  return impact.parentName === null
    ? "out of folders"
    : `to "${impact.parentName}"`
}

function subfolders(count: number) {
  return count === 1 ? "1 subfolder" : `${count} subfolders`
}

/** Counting and agreement together, so a single item never reads wrong. */
function items(count: number) {
  return count === 1
    ? { label: "1 item", is: "is", moves: "moves" }
    : { label: `${count} items`, is: "are", moves: "move" }
}
