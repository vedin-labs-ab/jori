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

/** MoveResourcesDialog specialized for exactly one resource, for hosts
 *  whose move affordance is inherently singular (detail pages, row menus
 *  outside a selectable list). */
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
    <MoveResourcesDialog
      onClose={onClose}
      organizationId={organizationId}
      resources={resource === undefined ? undefined : [resource]}
    />
  )
}

/** MoveToFolderDialog specialized for filed resources — a single row's
 *  "Move to folder…" and a bulk selection both pass through here. Pass the
 *  resources to open; it closes by clearing them. */
export function MoveResourcesDialog({
  onClose,
  organizationId,
  resources,
}: {
  onClose: () => void
  organizationId: string
  resources: MoveResourceTarget[] | undefined
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
        resources === undefined || resources.length === 0
          ? undefined
          : { kind: "resources", resources }
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
  const [selectedId, setSelectedId] = useState<string | null>(currentId ?? null)
  const folders = tree?.status === "ready" ? tree.folders : undefined

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move {subjectName(subject)}</DialogTitle>
        <DialogDescription>
          Choose the folder {isPlural(subject) ? "they" : "it"} should live in.
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
        await Promise.all(
          subject.resources.map((resource) =>
            fileResource({
              organizationId,
              resourceType: resource.resourceType,
              resourceId: resource.resourceId,
              folderId,
            })
          )
        )
      }

      toast.success(`Moved ${subjectName(subject)}.`)
      onMoved()
    } catch (error) {
      showErrorToast(error, `Could not move ${subjectName(subject)}.`)
    } finally {
      setIsMoving(false)
    }
  }

  return { isMoving, submit }
}

/** How the dialog names its subject: quoted for a single item, a count for
 *  a bulk selection. */
function subjectName(subject: MoveSubject) {
  if (subject.kind === "folder") {
    return `"${subject.name}"`
  }

  return subject.resources.length === 1
    ? `"${subject.resources[0].name}"`
    : `${subject.resources.length} items`
}

function isPlural(subject: MoveSubject) {
  return subject.kind === "resources" && subject.resources.length > 1
}

/** Where the subject lives today, marked in the picker and blocked as a
 *  no-op destination. Resources spread across folders have no single home,
 *  so nothing is marked and every destination stays open. */
function currentFolderId(subject: MoveSubject) {
  if (subject.kind === "folder") {
    return subject.parentId ?? null
  }

  const homes = new Set(
    subject.resources.map((resource) => resource.folderId ?? null)
  )

  return homes.size === 1 ? (subject.resources[0].folderId ?? null) : undefined
}

/** Remounts the body per subject so the selection resets with it. */
function subjectKey(subject: MoveSubject) {
  return subject.kind === "folder"
    ? `folder:${subject.folderId}`
    : subject.resources
        .map((resource) => `${resource.resourceType}:${resource.resourceId}`)
        .join("+")
}
