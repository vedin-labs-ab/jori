import { Folder } from "lucide-react"
import { type ReactNode } from "react"
import { useCreatedItem, useEditMenuFocus } from "../../edit/state"
import {
  ConsoleEmptyState,
  ConsoleListEmpty,
  EmptyRow,
  FilterableEmptyState,
} from "../../list/empty"
import { ConsoleListContent } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { type RowSelection } from "../../list/selection"
import { MenuSeparator } from "../../menu/items"
import { MenuArea } from "../../menu/row"
import { NewInFolderButton, NewInFolderSub } from "../create"
import { FolderUsageItem } from "../menu"
import {
  type FolderContentsResult,
  type FolderCreation,
  type FolderDialogRequest,
  type FolderResource,
  type ListedFolder,
} from "../types"
import { useFolderSelectionActions } from "./bar"
import {
  type FolderListEntry,
  selectionPayload,
  useFolderListing,
} from "./controls"
import { CreatedResourceRow, ResourceListRow } from "./resource"
import { type FolderSelectionActions } from "./select"
import {
  CreatedFolderRow,
  FolderListRow,
  FolderListTable,
  folderTableColumns,
} from "./table"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, in the shared full-bleed table, with the selection's
 *  dock over it. The states that replace the table sit in the padded
 *  content region instead. A right-click on the background offers what
 *  the folder itself can be asked: something new in it, and its usage. */
export function FolderContents(props: FolderContentsProps) {
  const { folderId, onCreate, onNewFolder } = props
  const onCloseAutoFocus = useEditMenuFocus()

  return (
    <MenuArea
      disabled={props.contents?.status !== "ready"}
      menu={
        <>
          <NewInFolderSub
            isTopLevel={folderId === undefined}
            onCreate={onCreate}
            onNewFolder={onNewFolder}
          />
          <MenuSeparator />
          <FolderUsageItem folderId={folderId} />
        </>
      }
      onCloseAutoFocus={onCloseAutoFocus}
    >
      {/* Boxless, so the listing's regions still lay out in the page. */}
      <div className="contents">
        <FolderContentsRegions {...props} />
      </div>
    </MenuArea>
  )
}

type FolderContentsProps = {
  contents: FolderContentsResult | undefined
  /** The folder being viewed — the one filed resources already sit in. */
  folderId: string | undefined
  /** The header's "New" menu again, for the empty state and a right-click. */
  onCreate: (creation: FolderCreation) => void
  onNewFolder: () => void
  onDialog: (request: FolderDialogRequest) => void
  /** A filed resource's own menu, trigger and all. */
  resourceMenu: (resource: FolderResource) => ReactNode
  selectionActions: FolderSelectionActions
}

function FolderContentsRegions({
  contents,
  folderId,
  onCreate,
  onNewFolder,
  onDialog,
  resourceMenu,
  selectionActions,
}: FolderContentsProps) {
  const created = useCreatedItem("contents", folderId)
  if (contents === undefined) {
    return (
      <ConsoleListContent>
        <ConsoleListLoading />
      </ConsoleListContent>
    )
  }

  if (contents.status !== "ready") {
    return (
      <ConsoleListEmpty>
        <ConsoleEmptyState
          title="Could not load the folder"
          description={
            contents.status === "unauthorized"
              ? contents.message
              : "The folder may have been deleted."
          }
          icon={Folder}
        />
      </ConsoleListEmpty>
    )
  }

  if (
    contents.folders.length === 0 &&
    contents.resources.length === 0 &&
    !created
  ) {
    return (
      <ConsoleListEmpty>
        <ConsoleEmptyState
          action={
            <NewInFolderButton onCreate={onCreate} onNewFolder={onNewFolder} />
          }
          description="File chats, tables, stores, files, and jobs here, or add a subfolder."
          icon={Folder}
          title="Empty folder"
        />
      </ConsoleListEmpty>
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
  folderId: string | undefined
  folders: readonly ListedFolder[]
  onDialog: (request: FolderDialogRequest) => void
  resourceMenu: (resource: FolderResource) => ReactNode
  resources: readonly FolderResource[]
  selectionActions: FolderSelectionActions
}) {
  const list = useFolderListing({ folders, resources })
  const selected = useFolderSelectionActions({
    actions: selectionActions,
    folderId,
    selection: list.selection,
  })

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
          selectionMenu={selected.menu}
        />
      </FolderListTable>
      {selected.dock}
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
  selectionMenu,
}: {
  folderId: string | undefined
  folders: ListedFolder[]
  onDialog: (request: FolderDialogRequest) => void
  resourceMenu: (resource: FolderResource) => ReactNode
  resources: FolderResource[]
  selection: RowSelection<FolderListEntry>
  selectionMenu: ReactNode
}) {
  const created = useCreatedItem("contents", folderId)
  const selected = selectionPayload(selection.selected, folderId)

  if (folders.length === 0 && resources.length === 0 && !created) {
    return (
      <EmptyRow colSpan={folderTableColumns}>
        <FilterableEmptyState
          description="File chats, tables, stores, files, and jobs here, or add a subfolder."
          hasFilters
          icon={Folder}
          noun="items"
        />
      </EmptyRow>
    )
  }

  return (
    <>
      {created?.item.kind === "folder" ? (
        <CreatedFolderRow
          edit={created}
          folder={folders.find((folder) => folder.folderId === created.item.id)}
        />
      ) : created ? (
        <CreatedResourceRow
          edit={created}
          resource={resources.find(
            (resource) => resource.id === created.item.id
          )}
        />
      ) : null}
      {folders
        .filter((folder) => folder.folderId !== created?.item.id)
        .map((folder) => (
          <FolderListRow
            folder={folder}
            key={folder.folderId}
            onDialog={onDialog}
            selected={selected}
            selection={selection}
            selectionMenu={selectionMenu}
          />
        ))}
      {resources
        .filter((resource) => resource.id !== created?.item.id)
        .map((resource) => (
          <ResourceListRow
            folderId={folderId}
            key={resource.id}
            menu={resourceMenu(resource)}
            resource={resource}
            selected={selected}
            selection={selection}
            selectionMenu={selectionMenu}
          />
        ))}
    </>
  )
}
