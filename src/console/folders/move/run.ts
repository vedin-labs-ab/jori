import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import {
  type MoveSubject,
  subjectName,
  subjectSize,
} from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import { type MoveConfirmation, useMoveConfirmation } from "./confirm"

/** Every console move, whether from the dialog or a drop: folders
 *  re-parent through `move`, filed resources re-file through `file`, and
 *  a single folder or resource passes the audience confirmation first.
 *  Resolves to whether the move landed. */
export function useMoveRun(organizationId: string | undefined) {
  const moveFolder = useMutation(api.folders.console.move)
  const fileResource = useMutation(api.folders.console.file)
  const confirmation = useMoveConfirmation(organizationId)
  const [isMoving, setIsMoving] = useState(false)

  async function move(moved: MoveSubject, destinationId: string | null) {
    if (organizationId === undefined) {
      return false
    }

    setIsMoving(true)

    try {
      const folderId =
        destinationId === null ? null : (destinationId as GenericId<"folders">)

      await Promise.all([
        ...moved.folders.map((folder) =>
          moveFolder({
            organizationId,
            folderId: folder.folderId as GenericId<"folders">,
            parentId: folderId,
          })
        ),
        ...moved.resources.map((resource) =>
          fileResource({
            organizationId,
            resourceType: resource.resourceType,
            resourceId: resource.resourceId,
            folderId,
          })
        ),
      ])
      toast.success(`Moved ${subjectName(moved)}.`)

      return true
    } catch (error) {
      showErrorToast(error, `Could not move ${subjectName(moved)}.`)

      return false
    } finally {
      setIsMoving(false)
    }
  }

  return {
    dialog: confirmation.dialog,
    isBusy: isMoving || confirmation.isResolving,
    run: (subject: MoveSubject, destinationId: string | null) =>
      confirmed(confirmation, subject, destinationId, () =>
        move(subject, destinationId)
      ),
  }
}

/** Puts a move through the confirmation when it has one audience to ask
 *  about, and resolves to what came of it: the move's own answer once it
 *  ran, or false when it was declined — or refused, because another move
 *  was still waiting on its answer. */
function confirmed(
  confirmation: MoveConfirmation,
  subject: MoveSubject,
  destinationId: string | null,
  run: () => Promise<boolean>
) {
  const asked = confirmable(subject)

  if (asked === undefined) {
    return run()
  }

  return new Promise<boolean>((resolve) => {
    const taken = confirmation.request({
      ...asked,
      folderId: destinationId,
      decline: () => resolve(false),
      run: () => run().then(resolve),
    })

    if (!taken) {
      resolve(false)
    }
  })
}

/** What the move can compare an audience for: one folder, which speaks
 *  for its contents, or one resource. A bulk selection has no single
 *  audience, so it moves without the question. */
function confirmable(subject: MoveSubject) {
  if (subjectSize(subject) !== 1) {
    return undefined
  }

  const [folder] = subject.folders

  if (folder !== undefined) {
    return {
      name: folder.name,
      subject: { kind: "folder" as const, folderId: folder.folderId },
    }
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
