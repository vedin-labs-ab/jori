import { type ReactNode, useState } from "react"
import { toast } from "sonner"
import {
  type FolderSelection,
  type FolderSelectionActions,
  folderSelectionRemovalSuccess,
} from "@/shared/console/folders/list/select"
import { type MoveSubject } from "@/shared/console/folders/types"
import { closeOnDismiss } from "@/shared/console/retain"
import { DemoMoveDialog } from "../dialogs/move"
import { type FolderId } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"

/** What a folder listing's selection bar does over the workspace: the
 *  move opens the shared dialog over the whole selection, and a removal
 *  lands at once — folders with their subfolders, everything else gone. */
export function useDemoFolderSelection(): {
  actions: FolderSelectionActions
  dialog: ReactNode
} {
  const { actions, state } = useDemoWorkspace()
  const [moving, setMoving] = useState<MoveSubject>()
  const remove = (selection: FolderSelection) => {
    for (const folder of selection.folders) {
      actions.deleteFolder(folder.folderId as FolderId, false)
    }

    for (const resource of selection.resources) {
      switch (resource.type) {
        case "chat":
          actions.fileResource("chat", resource.id, null)
          break
        case "job": {
          const job = state.jobs.find(
            (candidate) => candidate.id === resource.id
          )

          if (job !== undefined) {
            actions.deleteJob(job)
          }
          break
        }
        default:
          actions.removeMaterial(resource.id)
      }
    }

    toast.success(folderSelectionRemovalSuccess(selection))
  }

  return {
    actions: { isBusy: false, onMove: setMoving, onRemove: remove },
    dialog: (
      <DemoMoveDialog
        onOpenChange={closeOnDismiss(() => setMoving(undefined))}
        subject={moving}
      />
    ),
  }
}
