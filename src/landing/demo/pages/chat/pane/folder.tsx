import { useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type FolderDetail } from "@/shared/console/folders/types"
import { folderDetail } from "../../../derive/folders"
import { useDemoWorkspace } from "../../../workspace"
import { useDemoFolderContents } from "../../contents"

/** The folder's listing out of the workspace, with every row's menu and
 *  the selection's actions, as its page mounts it. */
export function DemoPaneFolder({ folderId }: { folderId: string }) {
  const { state } = useDemoWorkspace()
  const folder = useMemo(() => folderDetail(state, folderId), [state, folderId])

  return folder === undefined ? null : <DemoPaneContents folder={folder} />
}

function DemoPaneContents({ folder }: { folder: FolderDetail }) {
  const listing = useDemoFolderContents(folder)

  return (
    <ChatPaneBody
      material={{
        kind: "folder",
        contents: listing.contents,
        overlays: listing.overlays,
      }}
    />
  )
}
