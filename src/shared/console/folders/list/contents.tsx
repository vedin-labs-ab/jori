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
import { type RowSelection } from "../../list/selection"
import {
  type FolderContentsResult,
  type FolderDialogRequest,
  type FolderResource,
  type ListedFolder,
} from "../types"
import { FolderSelectionBar } from "./bar"
import {
  type FolderListEntry,
  resourceDragItem,
  useFolderListing,
} from "./controls"
import { ResourceListRow } from "./resource"
import { type FolderSelectionActions, splitSelection } from "./select"
import { FolderListRow, FolderListTable, folderTableColumns } from "./table"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, in the shared full-bleed table, with the selection's
 *  dock over it. The states that replace the table sit in the padded
 *  content region instead. */
export function FolderContents({
  contents,
  folderId,
  newMenu,
  onDialog,
  resourceMenu,
  selectionActions,
}: {
  contents: FolderContentsResult | undefined
  /** The folder being viewed — the one filed resources already sit in. */
  folderId: string
  /** The header's "New" menu again, as the empty state's call to action. */
  newMenu: ReactNode
  onDialog: (request: FolderDialogRequest) => void
  /** A filed resource's own menu, trigger and all. */
  resourceMenu: (resource: FolderResource) => ReactNode
  selectionActions: FolderSelectionActions
}) {
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
    <FolderListing
      folderId={folderId}
      folders={contents.folders}
      // Keyed on the folder: a selection is of this listing, and does
      // not follow the person into the next folder they open.
      key={folderId}
      onDialog={onDialog}
      resourceMenu={resourceMenu}
      resources={contents.resources}
      selectionActions={selectionActions}
    />
  )
}

/** The table and the dock over its selection, for a folder with contents. */
function FolderListing({
  folderId,
  folders,
  onDialog,
  resourceMenu,
  resources,
  selectionActions,
}: {
  folderId: string
  folders: readonly ListedFolder[]
  onDialog: (request: FolderDialogRequest) => void
  resourceMenu: (resource: FolderResource) => ReactNode
  resources: readonly FolderResource[]
  selectionActions: FolderSelectionActions
}) {
  const list = useFolderListing({ folders, resources })

  return (
    <>
      <FolderListTable
        controls={list.controls}
        kinds={list.kinds}
        owners={list.owners}
        selection={list.selection}
      >
        <FolderContentRows
          folderId={folderId}
          folders={list.folders}
          onDialog={onDialog}
          resourceMenu={resourceMenu}
          resources={list.resources}
          selection={list.selection}
        />
      </FolderListTable>
      <FolderSelectionBar
        actions={selectionActions}
        folderId={folderId}
        selection={list.selection}
      />
    </>
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
  selection,
}: {
  folderId: string
  folders: ListedFolder[]
  onDialog: (request: FolderDialogRequest) => void
  resourceMenu: (resource: FolderResource) => ReactNode
  resources: FolderResource[]
  selection: RowSelection<FolderListEntry>
}) {
  const selected = splitSelection(selection.selected).resources.map(
    (resource) => resourceDragItem(resource, folderId)
  )

  if (folders.length === 0 && resources.length === 0) {
    return (
      <EmptyRow colSpan={folderTableColumns}>
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
          selection={selection}
        />
      ))}
      {resources.map((resource) => (
        <ResourceListRow
          folderId={folderId}
          key={resource.id}
          menu={resourceMenu(resource)}
          resource={resource}
          selected={selected}
          selection={selection}
        />
      ))}
    </>
  )
}
