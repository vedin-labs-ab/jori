import { Plus } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../layout"
import { NewInFolderMenu } from "./create"
import { type FolderCreation } from "./types"

// What the folder surface puts in the console header: creating things sits
// in the header's own actions, and everything about the folder itself hangs
// off its name in the breadcrumb, the way material pages do it.

export function FolderHeaderActions({
  onCreate,
  onNewFolder,
}: {
  onCreate: (creation: FolderCreation) => void
  onNewFolder: () => void
}) {
  return (
    <ConsoleHeaderActions>
      <NewInFolderMenu onCreate={onCreate} onNewFolder={onNewFolder}>
        <ConsoleHeaderButton icon={<Plus />} label="New" type="button" />
      </NewInFolderMenu>
    </ConsoleHeaderActions>
  )
}
