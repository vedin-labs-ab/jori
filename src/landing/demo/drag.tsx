import { type ReactNode } from "react"
import { planDrop } from "@/shared/console/folders/drag/plan"
import { FolderDragProvider } from "@/shared/console/folders/drag/provider"
import { type FolderId } from "./fixtures/types"
import { useDemoWorkspace } from "./workspace"

/** The console's drag surface over the workspace: dropped folders
 *  re-parent, dropped resources re-file, and the move lands at once. */
export function DemoDragProvider({ children }: { children: ReactNode }) {
  const { actions, state } = useDemoWorkspace()

  return (
    <FolderDragProvider
      folders={state.folders}
      onDrop={(payload, target) => {
        const plan = planDrop(state.folders, payload, target.folderId)

        if (plan === undefined) {
          return Promise.resolve(false)
        }

        const destination = plan.folderId as FolderId | null

        for (const folder of plan.folders) {
          actions.moveFolder(folder.folderId as FolderId, destination)
        }

        for (const resource of plan.resources) {
          actions.fileResource(resource.type, resource.id, destination)
        }

        return Promise.resolve(true)
      }}
    >
      {children}
    </FolderDragProvider>
  )
}
