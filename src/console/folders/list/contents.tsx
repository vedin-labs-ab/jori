import { useQuery } from "convex/react"
import { type ComponentProps, type ReactNode } from "react"
import { useCreationRequests } from "@/shared/console/folders/creation"
import { type FolderContents } from "@/shared/console/folders/list/contents"
import {
  type FolderCreation,
  type FolderDetail,
  type FolderDialogRequest,
} from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import { CreationDialogs } from "../create/dialogs"
import { useFolderResourceActions } from "./actions"
import { ResourceRowMenu } from "./menu"
import { useFolderSelectionActions } from "./select"

/** A folder's listing bound to Convex, as its page and the chat's pane
 *  both mount it: the contents query, each filed resource's menu, the
 *  selection's actions, and what the "New" menu's entries start — with
 *  the dialogs those open, rendered once beside the list. */
export function useFolderContents({
  folder,
  onDialog,
  onNewFolder,
  organizationId,
}: {
  folder: FolderDetail | undefined
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  organizationId: string
}): {
  contents: ComponentProps<typeof FolderContents>
  onCreate: (creation: FolderCreation) => void
  overlays: ReactNode
} {
  const nested = useQuery(
    api.folders.console.contents,
    folder === undefined
      ? "skip"
      : { organizationId, folderId: folder.folderId }
  )
  const roots = useQuery(
    api.folders.console.roots,
    folder === undefined ? { organizationId } : "skip"
  )
  const contents = folder === undefined ? roots : nested
  const [creation, requestCreation] = useCreationRequests("contents")
  const setCreation = (creation: FolderCreation) =>
    requestCreation({ creation, folderId: folder?.folderId })
  const resources = useFolderResourceActions({
    contents,
    folder,
    organizationId,
  })
  const selection = useFolderSelectionActions(organizationId)

  return {
    contents: {
      contents,
      folderId: folder?.folderId,
      onCreate: setCreation,
      onDialog,
      onNewFolder,
      resourceMenu: (resource) => (
        <ResourceRowMenu actions={resources.actions} resource={resource} />
      ),
      selectionActions: selection.actions,
    },
    onCreate: setCreation,
    overlays: (
      <>
        <CreationDialogs
          onClose={() => requestCreation(undefined)}
          organizationId={organizationId}
          request={creation}
        />
        {resources.dialogs}
        {selection.dialog}
      </>
    ),
  }
}
