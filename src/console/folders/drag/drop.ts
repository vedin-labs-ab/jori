// Resolves a released drag into the mutation it planned: folders
// re-parent through `move`, filed resources re-file through `file`.
// Invalid and no-op targets resolve to no call; failures surface the way
// the move dialog's do.

import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { useFilingConfirmation } from "../move/confirm"
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

/** The drop handler behind onDragEnd, plus the confirmation a re-file may
 *  have to pass first. `onMoved` reports a landed folder move so its row
 *  can show the settle cue. */
export function useDropActions(
  organizationId: string | undefined,
  folders: readonly FolderSummary[],
  onMoved: (folderId: string) => void
) {
  const moveFolder = useMoveFolder(organizationId, folders, onMoved)
  const fileResource = useFileResource(organizationId, folders)

  return {
    dialog: fileResource.dialog,
    run: async (payload: DragPayload, target: DropTarget | undefined) => {
      if (target === undefined) {
        return
      }

      if (payload.kind === "folder") {
        await moveFolder(payload, target)
      } else {
        fileResource.request(payload, target)
      }
    },
  }
}

function useMoveFolder(
  organizationId: string | undefined,
  folders: readonly FolderSummary[],
  onMoved: (folderId: string) => void
) {
  const move = useMutation(api.folders.console.move)

  return async (payload: FolderDragPayload, target: DropTarget) => {
    const plan = planDrop(folders, payload.folderId, target.folderId)

    if (organizationId === undefined || plan === undefined) {
      return
    }

    try {
      await move({
        organizationId,
        folderId: payload.folderId as GenericId<"folders">,
        parentId: plan.parentId as GenericId<"folders"> | null,
      })
      onMoved(payload.folderId)
    } catch (error) {
      showErrorToast(error, `Could not move ${payload.name}.`)
    }
  }
}

function useFileResource(
  organizationId: string | undefined,
  folders: readonly FolderSummary[]
) {
  const file = useMutation(api.folders.console.file)
  const confirmation = useFilingConfirmation(organizationId)

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

  return {
    dialog: confirmation.dialog,
    request: (payload: ResourceDragPayload, target: DropTarget) => {
      const plan = planFileDrop(payload, target.folderId)

      if (organizationId === undefined || plan === undefined) {
        return
      }

      confirmation.request({
        resourceType: toFiledType(payload.type),
        resourceId: payload.id,
        name: payload.name,
        folderId: plan.folderId,
        run: () => refile(organizationId, payload, plan.folderId),
      })
    },
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
