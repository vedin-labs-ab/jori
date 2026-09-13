import { availableFolderName } from "@contracts/folders/name"
import { type ReactNode } from "react"
import { FolderEditingProvider } from "@/shared/console/folders/edit/provider"
import { type FolderId } from "./fixtures/types"
import { useDemoWorkspace } from "./workspace"

export function DemoFolderEditing({ children }: { children: ReactNode }) {
  const { state, actions } = useDemoWorkspace()
  return (
    <FolderEditingProvider
      folders={state.folders}
      onCreate={async (parentId) => {
        const name = availableFolderName(
          state.folders
            .filter((f) => f.parentId === parentId)
            .map((f) => f.name)
        )
        const folderId = actions.createFolder(
          name,
          parentId as FolderId | undefined
        )
        return { folderId, name, parentId }
      }}
      onRename={async (folderId, name) =>
        actions.renameFolder(folderId as FolderId, name)
      }
    >
      {children}
    </FolderEditingProvider>
  )
}
