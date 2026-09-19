import { type ComponentProps, type ReactNode, useMemo } from "react"
import { useCreationRequests } from "@/shared/console/folders/creation"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import { type FolderContents } from "@/shared/console/folders/list/contents"
import {
  type FolderCreation,
  type FolderDetail,
  type FolderDialogRequest,
  type ManagedFolder,
} from "@/shared/console/folders/types"
import { folderContents, rootFolders } from "../derive/folders"
import { DemoCreationDialogs } from "../dialogs/creation"
import { DemoFolderDialogs } from "../dialogs/folders"
import { type FolderId } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"
import { DemoResourceMenu } from "./menu"
import { useDemoFolderSelection } from "./select"

/** A folder's listing over the workspace, as its page and the chat's
 *  pane both mount it: the contents, each filed resource's menu, the
 *  selection's actions, and the "New" menu the empty state offers — with
 *  the dialogs those open, rendered once beside the list. */
export function useDemoFolderContents(
  folder: FolderDetail | undefined,
  onDeleted?: (folder: ManagedFolder) => void
): {
  contents: ComponentProps<typeof FolderContents>
  onCreate: (creation: FolderCreation) => void
  onDialog: (request: FolderDialogRequest) => void
  onNewFolder: () => void
  overlays: ReactNode
} {
  const { state } = useDemoWorkspace()
  const [dialog, setDialog] = useFolderRequests("contents")
  const [creation, requestCreation] = useCreationRequests("contents")
  const setCreation = (creation: FolderCreation) =>
    requestCreation({ creation, folderId: folder?.folderId })
  const selection = useDemoFolderSelection()
  const contents = useMemo(
    () =>
      folder === undefined
        ? rootFolders(state)
        : folderContents(state, folder.folderId as FolderId),
    [state, folder]
  )
  const onNewFolder = () =>
    setDialog({ type: "create", parentId: folder?.folderId })

  return {
    contents: {
      contents,
      folderId: folder?.folderId,
      onCreate: setCreation,
      onDialog: setDialog,
      onNewFolder,
      resourceMenu: (resource) => <DemoResourceMenu resource={resource} />,
      selectionActions: selection.actions,
    },
    onCreate: setCreation,
    onDialog: setDialog,
    onNewFolder,
    overlays: (
      <>
        <DemoFolderDialogs
          dialog={dialog}
          onClose={() => setDialog(undefined)}
          onDeleted={onDeleted}
        />
        <DemoCreationDialogs
          onClose={() => requestCreation(undefined)}
          request={creation}
        />
        {selection.dialog}
      </>
    ),
  }
}
