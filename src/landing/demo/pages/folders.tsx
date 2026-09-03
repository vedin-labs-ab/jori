import { formatUsd } from "@contracts/billing"
import { Plus } from "lucide-react"
import { useContext, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { NewInFolderMenu } from "@/shared/console/folders/create"
import { FolderHeaderActions } from "@/shared/console/folders/header"
import { FolderContents } from "@/shared/console/folders/list/contents"
import { RootFolderList } from "@/shared/console/folders/list/roots"
import {
  FoldersTitleMenu,
  FolderTitleMenu,
} from "@/shared/console/folders/menu"
import {
  type FolderCreation,
  type FolderDetail,
  type FolderDialogRequest,
} from "@/shared/console/folders/types"
import { UsageHintButton } from "@/shared/console/folders/usage/hint"
import {
  ConsoleHeaderActions,
  ConsoleHeaderAside,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import {
  ConsoleListContent,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "@/shared/console/materials/breadcrumb"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { folderContents, folderDetail, rootFolders } from "../derive/folders"
import { usageSpend } from "../derive/usage"
import { DemoCreationDialogs } from "../dialogs/creation"
import { DemoFolderDialogs } from "../dialogs/folders"
import { type FolderId } from "../fixtures/types"
import { type DemoState } from "../state/types"
import { useDemoWorkspace } from "../workspace"
import { DemoResourceMenu } from "./menu"
import { useDemoFolderSelection } from "./select"

/** The tree's landing page: the root folders in the shared table. */
export function RootFoldersPage() {
  const { state } = useDemoWorkspace()
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const roots = useMemo(() => rootFolders(state), [state])
  const selection = useDemoFolderSelection()
  const create = () => setDialog({ type: "create" })

  useMaterialTrail(
    useMemo(
      () => ({
        aside: (
          <ConsoleHeaderAside>
            <UsageHintButton amount={formatUsd(usageSpend(state, undefined))} />
          </ConsoleHeaderAside>
        ),
        menu: <FoldersTitleMenu />,
        name: "Folders",
      }),
      [state]
    )
  )

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New folder"
          onClick={create}
          type="button"
        />
      </ConsoleHeaderActions>
      <RootFolderList
        onCreate={create}
        onDialog={setDialog}
        roots={roots}
        selectionActions={selection.actions}
      />
      <DemoFolderDialogs dialog={dialog} onClose={() => setDialog(undefined)} />
      {selection.dialog}
    </ConsoleListLayout>
  )
}

/** A folder's page: everything filed here. */
export function FolderPage({ folderId }: { folderId: string }) {
  const { state } = useDemoWorkspace()
  const folder = useMemo(() => folderDetail(state, folderId), [state, folderId])

  if (folder === undefined) {
    return (
      <ConsoleListLayout>
        <ConsoleListContent>
          <Alert>
            <AlertTitle>Folder not found</AlertTitle>
            <AlertDescription>
              The folder may have been deleted or belongs to another
              organization.
            </AlertDescription>
          </Alert>
        </ConsoleListContent>
      </ConsoleListLayout>
    )
  }

  return <FolderContentsPage folder={folder} />
}

function FolderContentsPage({ folder }: { folder: FolderDetail }) {
  const { state } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [creation, setCreation] = useState<FolderCreation>()
  const selection = useDemoFolderSelection()
  const contents = useMemo(
    () => folderContents(state, folder.folderId as FolderId),
    [state, folder.folderId]
  )
  const onNewFolder = () =>
    setDialog({ type: "create", parentId: folder.folderId })

  useMaterialTrail(
    useMemo(() => folderCrumb(state, folder, setDialog), [state, folder])
  )

  return (
    <ConsoleListLayout>
      <FolderHeaderActions onCreate={setCreation} onNewFolder={onNewFolder} />
      <FolderContents
        contents={contents}
        folderId={folder.folderId}
        newMenu={
          <NewInFolderMenu onCreate={setCreation} onNewFolder={onNewFolder}>
            <Button type="button">
              <Plus />
              New
            </Button>
          </NewInFolderMenu>
        }
        onDialog={setDialog}
        resourceMenu={(resource) => <DemoResourceMenu resource={resource} />}
        selectionActions={selection.actions}
      />
      <DemoFolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        // Deleting this folder, or one above it, takes this page too.
        onDeleted={(deleted) =>
          navigation?.navigate(
            deleted.parentId === undefined
              ? "/folders"
              : `/folders/${deleted.parentId}`
          )
        }
      />
      <DemoCreationDialogs
        onClose={() => setCreation(undefined)}
        request={
          creation === undefined
            ? undefined
            : { creation, folderId: folder.folderId }
        }
      />
      {selection.dialog}
    </ConsoleListLayout>
  )
}

/** The folder's header crumb: the overview leads the trail, then the
 *  ancestors; the folder's own name opens its menu, with its spend beside. */
function folderCrumb(
  state: DemoState,
  folder: FolderDetail,
  onDialog: (request: FolderDialogRequest) => void
): MaterialBreadcrumb {
  return {
    aside: (
      <ConsoleHeaderAside>
        <UsageHintButton
          amount={formatUsd(usageSpend(state, folder.folderId as FolderId))}
          folderId={folder.folderId}
        />
      </ConsoleHeaderAside>
    ),
    menu: <FolderTitleMenu folder={folder} onDialog={onDialog} />,
    name: folder.name,
    trail: [
      { name: "Folders", to: "/folders" },
      ...folder.path.slice(0, -1).map((segment) => ({
        name: segment.name,
        params: { folderId: segment.folderId },
        to: "/folders/$folderId",
      })),
    ],
  }
}
