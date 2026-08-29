import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { useRetained } from "../shared/retain"
import { FolderPicker } from "./picker"
import { subtreeFolderIds } from "./tree"
import { type MoveResourceTarget, type MoveSubject } from "./types"

/** MoveToFolderDialog specialized for one filed resource: pass the resource
 *  to open, and it closes by clearing it. */
export function MoveResourceDialog({
  onClose,
  organizationId,
  resource,
}: {
  onClose: () => void
  organizationId: string
  resource: MoveResourceTarget | undefined
}) {
  return (
    <MoveToFolderDialog
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      organizationId={organizationId}
      subject={
        resource === undefined ? undefined : { kind: "resource", ...resource }
      }
    />
  )
}

/** Shared "Move to folder…" dialog: folders re-parent through `move`, filed
 *  resources re-file through `file`. Open it by passing a subject; pass
 *  undefined to close (the last subject is retained for the close
 *  animation). */
export function MoveToFolderDialog({
  onOpenChange,
  organizationId,
  subject,
}: {
  onOpenChange: (open: boolean) => void
  organizationId: string
  subject: MoveSubject | undefined
}) {
  const retained = useRetained(subject)

  return (
    <Dialog onOpenChange={onOpenChange} open={subject !== undefined}>
      <DialogContent className="sm:max-w-md">
        {retained === undefined ? null : (
          <MoveDialogBody
            key={subjectKey(retained)}
            onClose={() => onOpenChange(false)}
            organizationId={organizationId}
            subject={retained}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MoveDialogBody({
  onClose,
  organizationId,
  subject,
}: {
  onClose: () => void
  organizationId: string
  subject: MoveSubject
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const move = useMoveSubject(organizationId, subject, onClose)
  const currentId = currentFolderId(subject)
  const [selectedId, setSelectedId] = useState<string | null>(currentId)
  const folders = tree?.status === "ready" ? tree.folders : undefined

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move "{subject.name}"</DialogTitle>
        <DialogDescription>
          Choose the folder it should live in.
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
          disabledIds={
            subject.kind === "folder"
              ? subtreeFolderIds(folders, subject.folderId)
              : undefined
          }
          folders={folders}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
      )}
      <DialogFooter>
        <Button
          disabled={selectedId === currentId || move.isMoving}
          onClick={() => void move.submit(selectedId)}
          type="button"
        >
          {move.isMoving ? <Loader2 className="animate-spin" /> : null}
          Move
        </Button>
      </DialogFooter>
    </>
  )
}

function useMoveSubject(
  organizationId: string,
  subject: MoveSubject,
  onMoved: () => void
) {
  const moveFolder = useMutation(api.folders.console.move)
  const fileResource = useMutation(api.folders.console.file)
  const [isMoving, setIsMoving] = useState(false)

  async function submit(destinationId: string | null) {
    setIsMoving(true)

    try {
      const folderId =
        destinationId === null ? null : (destinationId as GenericId<"folders">)

      if (subject.kind === "folder") {
        await moveFolder({
          organizationId,
          folderId: subject.folderId as GenericId<"folders">,
          parentId: folderId,
        })
      } else {
        await fileResource({
          organizationId,
          resourceType: subject.resourceType,
          resourceId: subject.resourceId,
          folderId,
        })
      }

      toast.success(`Moved ${subject.name}.`)
      onMoved()
    } catch (error) {
      showErrorToast(error, `Could not move ${subject.name}.`)
    } finally {
      setIsMoving(false)
    }
  }

  return { isMoving, submit }
}

function currentFolderId(subject: MoveSubject) {
  return (
    (subject.kind === "folder" ? subject.parentId : subject.folderId) ?? null
  )
}

/** Remounts the body per subject so the selection resets with it. */
function subjectKey(subject: MoveSubject) {
  return subject.kind === "folder"
    ? `folder:${subject.folderId}`
    : `${subject.resourceType}:${subject.resourceId}`
}
