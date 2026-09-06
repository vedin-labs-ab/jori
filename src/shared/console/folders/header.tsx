import { Plus } from "lucide-react"
import { type ReactNode } from "react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../layout"
import { NewInFolderMenu } from "./create"
import { type FolderCreation } from "./types"

// What the folder surface puts in the console header: what the host adds,
// then creating things in the header's own actions; everything about the
// folder itself hangs off its name in the breadcrumb, the way material
// pages do it.

export function FolderHeaderActions({
  children,
  onCreate,
  onNewFolder,
}: {
  children?: ReactNode
  onCreate: (creation: FolderCreation) => void
  onNewFolder: () => void
}) {
  return (
    <ConsoleHeaderActions>
      {children}
      <NewInFolderMenu onCreate={onCreate} onNewFolder={onNewFolder}>
        <ConsoleHeaderButton icon={<Plus />} label="New" type="button" />
      </NewInFolderMenu>
    </ConsoleHeaderActions>
  )
}
