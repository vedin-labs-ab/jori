import { useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type FolderDetail } from "@/shared/console/folders/types"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { folderDetail } from "../../../derive/folders"
import { DemoVisibilityButton } from "../../../dialogs/button"
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
  useMaterialBreadcrumb(
    folder.name,
    undefined,
    <DemoVisibilityButton
      visibility={folder.visibility}
      ownerId={folder.createdBy}
      folderId={folder.parentId}
      target={{ kind: "folder", id: folder.folderId }}
    />
  )

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
