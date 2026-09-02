// Resolves a released drag into the mutation it planned: folders
// re-parent through `move`, filed resources re-file through `file`.
// Invalid and no-op targets resolve to no call; failures surface the way
// the move dialog's do. Both kinds pass the audience confirmation first —
// one dialog for the whole drag surface, since a drag releases once.

import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import {
  type DragPayload,
  type DropTarget,
  type FolderDragPayload,
  planDrop,
  planFileDrop,
  type ResourceDragPayload,
} from "@/shared/console/folders/drag/plan"
import { type FolderDrop } from "@/shared/console/folders/drag/provider"
import { type FolderSummary } from "@/shared/console/folders/tree"
import { toFiledType } from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import {
  type MoveConfirmation,
  type PendingMove,
  useMoveConfirmation,
} from "../move/confirm"

/** The drop handler behind the drag provider, plus the confirmation a
 *  drop may have to pass first. */
export function useDropActions(
  organizationId: string | undefined,
  folders: readonly FolderSummary[]
): { dialog: ReactNode; run: FolderDrop } {
  const confirmation = useMoveConfirmation(organizationId)
  const dropFolder = useFolderDrop(organizationId, confirmation)
  const dropResource = useResourceDrop(organizationId, confirmation, folders)

  return {
    dialog: confirmation.dialog,
    run: (payload: DragPayload, target: DropTarget) =>
      payload.kind === "folder"
        ? dropFolder(
            payload,
            planDrop(folders, payload.folderId, target.folderId)
          )
        : dropResource(payload, planFileDrop(payload, target.folderId)),
  }
}

/** Re-parenting takes the folder's contents with it, so the confirmation
 *  speaks for the whole subtree the chain above it now covers. */
function useFolderDrop(
  organizationId: string | undefined,
  confirmation: MoveConfirmation
) {
  const move = useMutation(api.folders.console.move)
  const reparent = async (
    organization: string,
    payload: FolderDragPayload,
    parentId: string | null
  ) => {
    try {
      await move({
        organizationId: organization,
        folderId: payload.folderId as GenericId<"folders">,
        parentId: parentId as GenericId<"folders"> | null,
      })

      return true
    } catch (error) {
      showErrorToast(error, `Could not move ${payload.name}.`)

      return false
    }
  }

  return (
    payload: FolderDragPayload,
    plan: { parentId: string | null } | undefined
  ) => {
    if (organizationId === undefined || plan === undefined) {
      return Promise.resolve(false)
    }

    return confirmed(
      confirmation,
      {
        subject: { kind: "folder", folderId: payload.folderId },
        name: payload.name,
        folderId: plan.parentId,
      },
      () => reparent(organizationId, payload, plan.parentId)
    )
  }
}

function useResourceDrop(
  organizationId: string | undefined,
  confirmation: MoveConfirmation,
  folders: readonly FolderSummary[]
) {
  const file = useMutation(api.folders.console.file)
  const refile = async (
    organization: string,
    payload: ResourceDragPayload,
    folderId: string | null
  ) => {
    try {
      await file({
        organizationId: organization,
        resourceType: toFiledType(payload.type),
        resourceId: payload.id,
        folderId: folderId as GenericId<"folders"> | null,
      })
      toast.success(filedMessage(payload.name, folderId, folders))

      return true
    } catch (error) {
      showErrorToast(error, `Could not move ${payload.name}.`)

      return false
    }
  }

  return (
    payload: ResourceDragPayload,
    plan: { folderId: string | null } | undefined
  ) => {
    if (organizationId === undefined || plan === undefined) {
      return Promise.resolve(false)
    }

    return confirmed(
      confirmation,
      {
        subject: {
          kind: "resource",
          resourceType: toFiledType(payload.type),
          resourceId: payload.id,
        },
        name: payload.name,
        folderId: plan.folderId,
      },
      () => refile(organizationId, payload, plan.folderId)
    )
  }
}

/** Puts a move through the confirmation and resolves to what came of it:
 *  the move's own answer once it ran, or false when it was declined — or
 *  refused, because another move was still waiting on its answer. */
function confirmed(
  confirmation: MoveConfirmation,
  move: Omit<PendingMove, "decline" | "run">,
  run: () => Promise<boolean>
) {
  return new Promise<boolean>((resolve) => {
    const taken = confirmation.request({
      ...move,
      decline: () => resolve(false),
      run: () => run().then(resolve),
    })

    if (!taken) {
      resolve(false)
    }
  })
}

function filedMessage(
  name: string,
  folderId: string | null,
  folders: readonly FolderSummary[]
) {
  const folder = folders.find((row) => row.folderId === folderId)

  return folderId === null
    ? `Moved ${name} out of the folder.`
    : `Moved ${name} to ${folder?.name ?? "the folder"}.`
}
