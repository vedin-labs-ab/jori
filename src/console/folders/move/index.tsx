import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import { MoveDialog } from "@/shared/console/folders/dialogs/move"
import {
  type MoveResourceTarget,
  type MoveSubject,
  subjectName,
} from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import { useMoveConfirmation } from "./confirm"

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

/** The shared "Move to folder…" dialog bound to Convex: the organization's
 *  tree to choose from, and the moves themselves — folders re-parent
 *  through `move`, filed resources re-file through `file` — behind the
 *  audience confirmation. Open it by passing a subject; pass undefined to
 *  close. */
export function MoveToFolderDialog({
  onOpenChange,
  organizationId,
  subject,
}: {
  onOpenChange: (open: boolean) => void
  organizationId: string
  subject: MoveSubject | undefined
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const move = useMoveSubject(organizationId, subject, () =>
    onOpenChange(false)
  )

  return (
    <>
      <MoveDialog
        folders={tree?.status === "ready" ? tree.folders : undefined}
        isBusy={move.isBusy}
        onMove={move.submit}
        onOpenChange={onOpenChange}
        subject={subject}
      />
      {move.dialog}
    </>
  )
}

function useMoveSubject(
  organizationId: string,
  subject: MoveSubject | undefined,
  onMoved: () => void
) {
  const moveFolder = useMutation(api.folders.console.move)
  const fileResource = useMutation(api.folders.console.file)
  const confirmation = useMoveConfirmation(organizationId)
  const [isMoving, setIsMoving] = useState(false)

  async function run(moved: MoveSubject, destinationId: string | null) {
    setIsMoving(true)

    try {
      const folderId =
        destinationId === null ? null : (destinationId as GenericId<"folders">)

      if (moved.kind === "folder") {
        await moveFolder({
          organizationId,
          folderId: moved.folderId as GenericId<"folders">,
          parentId: folderId,
        })
      } else {
        await Promise.all(
          moved.resources.map((resource) =>
            fileResource({
              organizationId,
              resourceType: resource.resourceType,
              resourceId: resource.resourceId,
              folderId,
            })
          )
        )
      }

      toast.success(`Moved ${subjectName(moved)}.`)
      onMoved()
    } catch (error) {
      showErrorToast(error, `Could not move ${subjectName(moved)}.`)
    } finally {
      setIsMoving(false)
    }
  }

  function submit(destinationId: string | null) {
    if (subject === undefined) {
      return
    }

    const asked = confirmable(subject)

    if (asked === undefined) {
      void run(subject, destinationId)

      return
    }

    confirmation.request({
      ...asked,
      folderId: destinationId,
      run: () => run(subject, destinationId),
    })
  }

  return {
    dialog: confirmation.dialog,
    isBusy: isMoving || confirmation.isResolving,
    submit,
  }
}

/** What the move can compare an audience for: a folder, which speaks for
 *  its contents, or one resource. A bulk selection has no single audience,
 *  so it moves without the question. */
function confirmable(subject: MoveSubject) {
  if (subject.kind === "folder") {
    return {
      name: subject.name,
      subject: { kind: "folder" as const, folderId: subject.folderId },
    }
  }

  if (subject.resources.length !== 1) {
    return undefined
  }

  const [resource] = subject.resources

  return {
    name: resource.name,
    subject: {
      kind: "resource" as const,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
    },
  }
}
