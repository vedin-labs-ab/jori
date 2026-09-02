import { Folder } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ConsoleEmptyState,
  EmptyRow,
  FilterableEmptyState,
} from "../../list/empty"
import { ConsoleListContent } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import {
  type FolderContentsResult,
  type FolderDialogRequest,
  type FolderResource,
  type ListedFolder,
} from "../types"
import { useFolderListControls } from "./controls"
import { ResourceListRow } from "./resource"
import { FolderListRow, FolderListTable } from "./table"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, in the shared full-bleed table. The states that replace
 *  the table sit in the padded content region instead. */
export function FolderContents({
  contents,
  folderId,
  newMenu,
  onDialog,
  resourceMenu,
}: {
  contents: FolderContentsResult | undefined
  /** The folder being viewed — the one filed resources already sit in. */
  folderId: string
  /** The header's "New" menu again, as the empty state's call to action. */
  newMenu: ReactNode
  onDialog: (request: FolderDialogRequest) => void
  /** A filed resource's own menu, trigger and all. */
  resourceMenu: (resource: FolderResource) => ReactNode
}) {
  const list = useFolderListControls(
    contents?.status === "ready" ? contents : { folders: [], resources: [] }
  )

  if (contents === undefined) {
    return (
      <ConsoleListContent>
        <ConsoleListLoading />
      </ConsoleListContent>
    )
  }

  if (contents.status !== "ready") {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load the folder</AlertTitle>
          <AlertDescription>
            {contents.status === "unauthorized"
              ? contents.message
              : "The folder may have been deleted."}
          </AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (contents.folders.length === 0 && contents.resources.length === 0) {
    return (
      <ConsoleListContent>
        <ConsoleEmptyState
          action={newMenu}
          description="File tables, stores, files, and jobs here, or add a subfolder."
          icon={Folder}
          title="Empty folder"
        />
      </ConsoleListContent>
    )
  }

  return (
    <FolderListTable
      controls={list.controls}
      kinds={list.kinds}
      owners={list.owners}
    >
      <FolderContentRows
        folderId={folderId}
        folders={list.narrow(contents.folders)}
        onDialog={onDialog}
        resourceMenu={resourceMenu}
        resources={list.narrow(contents.resources)}
      />
    </FolderListTable>
  )
}

/** The listing's two row groups, subfolders first — or the one row that
 *  stands in when the header filters leave nothing behind. */
function FolderContentRows({
  folderId,
  folders,
  onDialog,
  resourceMenu,
  resources,
}: {
  folderId: string
  folders: ListedFolder[]
  onDialog: (request: FolderDialogRequest) => void
  resourceMenu: (resource: FolderResource) => ReactNode
  resources: FolderResource[]
}) {
  if (folders.length === 0 && resources.length === 0) {
    return (
      <EmptyRow colSpan={6}>
        <FilterableEmptyState
          description="File tables, stores, files, and jobs here, or add a subfolder."
          hasFilters
          icon={Folder}
          noun="items"
        />
      </EmptyRow>
    )
  }

  return (
    <>
      {folders.map((folder) => (
        <FolderListRow
          folder={folder}
          key={folder.folderId}
          onDialog={onDialog}
        />
      ))}
      {resources.map((resource) => (
        <ResourceListRow
          folderId={folderId}
          key={resource.id}
          menu={resourceMenu(resource)}
          resource={resource}
        />
      ))}
    </>
  )
}
