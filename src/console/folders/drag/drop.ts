// Resolves a released drag into the mutation it planned: folders
// re-parent through `move`, filed resources re-file through `file`.
// Invalid and no-op targets resolve to no call; failures surface the way
// the move dialog's do. Both kinds pass the audience confirmation first —
// one dialog for the whole drag surface, since a drag releases once.

import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../convex/_generated/api"
import { type MoveConfirmation, useMoveConfirmation } from "../move/confirm"
import { type FolderSummary } from "../tree"
import { toFiledType } from "../types"
import {
  type DragPayload,
  type DropTarget,
  type FolderDragPayload,
  planDrop,
  planFileDrop,
  type ResourceDragPayload,
} from "./plan"

/** The drop handler behind onDragEnd, plus the confirmation a drop may
 *  have to pass first. `onMoved` reports a landed folder move so its row
 *  can show the settle cue. */
export function useDropActions(
  organizationId: string | undefined,
  folders: readonly FolderSummary[],
  onMoved: (folderId: string) => void
) {
  const confirmation = useMoveConfirmation(organizationId)
  const dropFolder = useFolderDrop(organizationId, confirmation, onMoved)
  const dropResource = useResourceDrop(organizationId, confirmation, folders)

  return {
    dialog: confirmation.dialog,
    run: (payload: DragPayload, target: DropTarget | undefined) => {
      if (target === undefined) {
        return
      }

      if (payload.kind === "folder") {
        dropFolder(
          payload,
          planDrop(folders, payload.folderId, target.folderId)
        )
      } else {
        dropResource(payload, planFileDrop(payload, target.folderId))
      }
    },
  }
}

/** Re-parenting takes the folder's contents with it, so the confirmation
 *  speaks for the whole subtree the chain above it now covers. */
function useFolderDrop(
  organizationId: string | undefined,
  confirmation: MoveConfirmation,
  onMoved: (folderId: string) => void
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
      onMoved(payload.folderId)
    } catch (error) {
      showErrorToast(error, `Could not move ${payload.name}.`)
    }
  }

  return (
    payload: FolderDragPayload,
    plan: { parentId: string | null } | undefined
  ) => {
    if (organizationId === undefined || plan === undefined) {
      return
    }

    confirmation.request({
      subject: { kind: "folder", folderId: payload.folderId },
      name: payload.name,
      folderId: plan.parentId,
      run: () => reparent(organizationId, payload, plan.parentId),
    })
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
    } catch (error) {
      showErrorToast(error, `Could not move ${payload.name}.`)
    }
  }

  return (
    payload: ResourceDragPayload,
    plan: { folderId: string | null } | undefined
  ) => {
    if (organizationId === undefined || plan === undefined) {
      return
    }

    confirmation.request({
      subject: {
        kind: "resource",
        resourceType: toFiledType(payload.type),
        resourceId: payload.id,
      },
      name: payload.name,
      folderId: plan.folderId,
      run: () => refile(organizationId, payload, plan.folderId),
    })
  }
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
