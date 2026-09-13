import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import { type FolderDetail } from "@/shared/console/folders/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { api } from "../../../../convex/_generated/api"
import { useFolderContents } from "../../folders/list/contents"
import { FolderDialogs } from "../../folders/manage"

/** A folder in the pane: its listing as its page mounts it, with every
 *  row's menu and the selection's actions, but none of the page's own
 *  header. */
export function PaneFolder({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const detail = useQuery(api.folders.console.get, {
    organizationId,
    folderId: id as GenericId<"folders">,
  })

  if (detail === undefined) {
    return <ConsoleListLoading />
  }

  if (detail.status !== "ready") {
    return null
  }

  return <PaneContents folder={detail.folder} organizationId={organizationId} />
}

function PaneContents({
  folder,
  organizationId,
}: {
  folder: FolderDetail
  organizationId: string
}) {
  const [dialog, setDialog] = useFolderRequests("contents")
  useMaterialBreadcrumb(
    folder.name,
    undefined,
    <VisibilityButton
      visibility={folder.visibility}
      folderId={folder.parentId}
      ownerId={folder.createdBy}
      onClick={() => setDialog({ type: "access", folder })}
    />
  )
  const listing = useFolderContents({
    folder,
    onDialog: setDialog,
    onNewFolder: () => setDialog({ type: "create", parentId: folder.folderId }),
    organizationId,
  })

  return (
    <ChatPaneBody
      material={{
        kind: "folder",
        contents: listing.contents,
        overlays: (
          <>
            {listing.overlays}
            <FolderDialogs
              dialog={dialog}
              onClose={() => setDialog(undefined)}
              // Only the listed subfolders can be deleted from here, and
              // the listing follows on its own; the folder itself has no
              // menu in the pane, so nothing ever has to leave.
              onDeleted={() => undefined}
              organizationId={organizationId}
            />
          </>
        ),
      }}
    />
  )
}
