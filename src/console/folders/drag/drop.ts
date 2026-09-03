// Resolves a released drag into the move it planned and hands it to the
// same run every console move uses: folders re-parent, resources re-file,
// a single folder or resource passes the audience confirmation first, and
// invalid and no-op targets resolve to no call.

import { type ReactNode } from "react"
import {
  type DragPayload,
  type DragPlan,
  type DropTarget,
  planDrop,
} from "@/shared/console/folders/drag/plan"
import { type FolderDrop } from "@/shared/console/folders/drag/provider"
import { type FolderSummary } from "@/shared/console/folders/tree"
import {
  type MoveSubject,
  moveTarget,
  toFiledType,
} from "@/shared/console/folders/types"
import { useMoveRun } from "../move/run"

/** The drop handler behind the drag provider, plus the confirmation a
 *  drop may have to pass first. */
export function useDropActions(
  organizationId: string | undefined,
  folders: readonly FolderSummary[]
): { dialog: ReactNode; run: FolderDrop } {
  const move = useMoveRun(organizationId)

  return {
    dialog: move.dialog,
    run: (payload: DragPayload, target: DropTarget) => {
      const plan = planDrop(folders, payload, target.folderId)

      return plan === undefined
        ? Promise.resolve(false)
        : move.run(planSubject(folders, plan), plan.folderId)
    },
  }
}

/** The plan as the move run takes it: where each folder sits today comes
 *  from the tree, where each resource sits from the row it was picked up
 *  from. */
function planSubject(
  folders: readonly FolderSummary[],
  plan: DragPlan
): MoveSubject {
  return {
    folders: plan.folders.map((folder) => ({
      folderId: folder.folderId,
      name: folder.name,
      parentId: folders.find((row) => row.folderId === folder.folderId)
        ?.parentId,
    })),
    resources: plan.resources.map((item) =>
      moveTarget(toFiledType(item.type), item.id, item)
    ),
  }
}
