import { useQuery } from "convex/react"
import { type ComponentProps, type ReactNode, useState } from "react"
import { NewInFolderButton } from "@/shared/console/folders/create"
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
 *  selection's actions, and the "New" menu the empty state offers — with
 *  the dialogs those open, rendered once beside the list. */
export function useFolderContents({
  folder,
  onDialog,
  onNewFolder,
  organizationId,
}: {
  folder: FolderDetail
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  organizationId: string
}): {
  contents: ComponentProps<typeof FolderContents>
  onCreate: (creation: FolderCreation) => void
  overlays: ReactNode
} {
  const contents = useQuery(api.folders.console.contents, {
    organizationId,
    folderId: folder.folderId,
  })
  const [creation, setCreation] = useState<FolderCreation>()
  const resources = useFolderResourceActions({
    contents,
    folder,
    organizationId,
  })
  const selection = useFolderSelectionActions(organizationId)

  return {
    contents: {
      contents,
      folderId: folder.folderId,
      newMenu: (
        <NewInFolderButton onCreate={setCreation} onNewFolder={onNewFolder} />
      ),
      onDialog,
      resourceMenu: (resource) => (
        <ResourceRowMenu actions={resources.actions} resource={resource} />
      ),
      selectionActions: selection.actions,
    },
    onCreate: setCreation,
    overlays: (
      <>
        <CreationDialogs
          onClose={() => setCreation(undefined)}
          organizationId={organizationId}
          request={
            creation === undefined
              ? undefined
              : { creation, folderId: folder.folderId }
          }
        />
        {resources.dialogs}
        {selection.dialog}
      </>
    ),
  }
}
