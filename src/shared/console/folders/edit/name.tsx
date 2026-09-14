import { type ReactNode } from "react"
import { ItemName } from "../../edit/name"
import { type EditSurface } from "../../edit/state"
import { type FolderSummary } from "../tree"

export function FolderName({
  folder,
  surface,
  children,
}: {
  folder: FolderSummary
  surface: EditSurface
  children: ReactNode
}) {
  return (
    <ItemName
      item={{
        id: folder.folderId,
        kind: "folder",
        name: folder.name,
        parentId: folder.parentId,
      }}
      surface={surface}
    >
      {children}
    </ItemName>
  )
}
