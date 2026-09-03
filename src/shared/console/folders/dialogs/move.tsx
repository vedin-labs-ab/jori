import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useRetained } from "../../retain"
import { FolderPicker } from "../picker"
import { subtreeFolderIds } from "../tree"
import {
  type FolderRow,
  type MoveSubject,
  subjectName,
  subjectSize,
} from "../types"

/** The "Move to folder…" dialog: folders re-parent, filed resources
 *  re-file — one row, or a selection of either or both. Open it by
 *  passing a subject; pass undefined to close (the last subject is
 *  retained for the close animation). Where the move lands is the host's
 *  to run. */
export function MoveDialog({
  folders,
  isBusy,
  onMove,
  onOpenChange,
  subject,
}: {
  /** The organization's folders; undefined while they are on their way. */
  folders: FolderRow[] | undefined
  /** True while the host is still deciding on, or running, the move. */
  isBusy: boolean
  /** Moves the subject into the folder; null is the top level. */
  onMove: (destinationId: string | null) => void
  onOpenChange: (open: boolean) => void
  subject: MoveSubject | undefined
}) {
  const retained = useRetained(subject)

  return (
    <Dialog onOpenChange={onOpenChange} open={subject !== undefined}>
      <DialogContent className="sm:max-w-md">
        {retained === undefined ? null : (
          <MoveDialogBody
            folders={folders}
            isBusy={isBusy}
            key={subjectKey(retained)}
            onMove={onMove}
            subject={retained}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MoveDialogBody({
  folders,
  isBusy,
  onMove,
  subject,
}: {
  folders: FolderRow[] | undefined
  isBusy: boolean
  onMove: (destinationId: string | null) => void
  subject: MoveSubject
}) {
  const currentId = currentFolderId(subject)
  const [selectedId, setSelectedId] = useState<string | null>(currentId ?? null)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="wrap-anywhere">
          Move {subjectName(subject)}
        </DialogTitle>
        <DialogDescription>
          Choose the folder {subjectSize(subject) > 1 ? "they" : "it"} should
          live in.
        </DialogDescription>
      </DialogHeader>
      {folders === undefined ? (
        <div className="grid gap-2 rounded-md border p-2">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ) : (
        <FolderPicker
          className="rounded-md border p-1"
          currentId={currentId}
          disabledIds={disabledFolderIds(folders, subject)}
          folders={folders}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
      )}
      <DialogFooter>
        <Button
          disabled={selectedId === currentId || isBusy}
          onClick={() => onMove(selectedId)}
          type="button"
        >
          {isBusy ? <Spinner /> : null}
          Move
        </Button>
      </DialogFooter>
    </>
  )
}

/** Where the subject lives today, marked in the picker and blocked as a
 *  no-op destination. Items spread across folders have no single home, so
 *  nothing is marked and every destination stays open. */
function currentFolderId(subject: MoveSubject) {
  const homes = new Set([
    ...subject.folders.map((folder) => folder.parentId ?? null),
    ...subject.resources.map((resource) => resource.folderId ?? null),
  ])

  return homes.size === 1 ? [...homes][0] : undefined
}

/** A moving folder's own subtree: dropping it there would create a cycle. */
function disabledFolderIds(folders: FolderRow[], subject: MoveSubject) {
  if (subject.folders.length === 0) {
    return undefined
  }

  return new Set(
    subject.folders.flatMap((folder) => [
      ...subtreeFolderIds(folders, folder.folderId),
    ])
  )
}

/** Remounts the body per subject so the selection resets with it. */
function subjectKey(subject: MoveSubject) {
  return [
    ...subject.folders.map((folder) => `folder:${folder.folderId}`),
    ...subject.resources.map(
      (resource) => `${resource.resourceType}:${resource.resourceId}`
    ),
  ].join("+")
}
