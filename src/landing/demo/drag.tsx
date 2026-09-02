import { type ReactNode } from "react"
import { planDrop, planFileDrop } from "@/shared/console/folders/drag/plan"
import { FolderDragProvider } from "@/shared/console/folders/drag/provider"
import { type FolderId } from "./fixtures/types"
import { useDemoWorkspace } from "./workspace"

/** The console's drag surface over the workspace: dropping a folder row on
 *  another re-parents it, dropping a filed resource re-files it. */
export function DemoDragProvider({ children }: { children: ReactNode }) {
  const { actions, state } = useDemoWorkspace()

  return (
    <FolderDragProvider
      folders={state.folders}
      onDrop={(payload, target) => {
        if (payload.kind === "folder") {
          const plan = planDrop(
            state.folders,
            payload.folderId,
            target.folderId
          )

          if (plan !== undefined) {
            actions.moveFolder(
              payload.folderId as FolderId,
              plan.parentId as FolderId | null
            )
          }

          return Promise.resolve(plan !== undefined)
        }

        const plan = planFileDrop(payload, target.folderId)

        if (plan !== undefined) {
          actions.fileResource(
            payload.type,
            payload.id,
            plan.folderId as FolderId | null
          )
        }

        return Promise.resolve(plan !== undefined)
      }}
    >
      {children}
    </FolderDragProvider>
  )
}
