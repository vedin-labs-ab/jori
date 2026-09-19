import { Upload } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useEditing } from "@/shared/console/edit/state"
import { FileTable } from "@/shared/console/files/list"
import {
  fileDeleteDescription,
  fileListConfig,
  fileNoun,
} from "@/shared/console/files/list/config"
import { type FileRow } from "@/shared/console/files/types"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { type MaterialRemoval } from "@/shared/console/materials/removal"
import { StoreList, StoresToolbar } from "@/shared/console/stores/list"
import {
  storeDeleteDescription,
  storeListConfig,
  storeNoun,
} from "@/shared/console/stores/list/config"
import { type StoreSummary } from "@/shared/console/stores/types"
import { TableList, TablesToolbar } from "@/shared/console/tables/list"
import {
  tableDeleteDescription,
  tableListConfig,
  tableNoun,
} from "@/shared/console/tables/list/config"
import { type TableSummary } from "@/shared/console/tables/types"
import { folderNames } from "../derive/folders"
import {
  fileRows,
  materialOf,
  storeSummaries,
  tableSummaries,
} from "../derive/materials"
import { type MaterialRequest } from "../dialogs/materials"
import { DemoUploadDialog } from "../dialogs/upload"
import { useDemoWorkspace } from "../workspace"
import { useMaterialListing } from "./listing"
import { useMaterialListOverlays } from "./overlays"

// The three material lists over the workspace, each the console's own
// list view inside the console's own list layout, with the row menus'
// dialogs and the selection bar bound to the workspace.

export function TablesPage() {
  const { actions, state } = useDemoWorkspace()
  const tables = useMemo(() => tableSummaries(state), [state])
  const folders = useMemo(() => folderNames(state), [state])
  const listing = useMaterialListing({
    config: tableListConfig(folders, tables),
    identify: (table) => table.tableId,
    noun: tableNoun,
    rows: tables,
  })
  const [request, setRequest] = useState<MaterialRequest>()
  const editing = useEditing()
  const requestFor = (kind: MaterialRequest["kind"]) => (table: TableSummary) =>
    setRequest(withMaterial(kind, materialOf(state, table.tableId)))
  const create = () => editing?.create("table", undefined, "table")
  const list = useMaterialListOverlays({
    create: null,
    deleteDescription: tableDeleteDescription,
    identify: (table) => table.tableId,
    noun: tableNoun,
    onCloseRequest: () => setRequest(undefined),
    pagination: listing.pagination,
    request,
    selection: listing.selection,
    toMaterial: (table) => materialOf(state, table.tableId),
  })

  return (
    <ConsoleListLayout>
      <TablesToolbar
        onCreate={create}
        onImport={() => toast("Import a CSV from the console.")}
        onQueryChange={listing.setQuery}
        query={listing.query}
      />
      <TableList
        config={listing.config}
        controls={listing.controls}
        folders={folders}
        hasFilters={listing.hasFilters}
        onAccess={requestFor("access")}
        onCreate={create}
        onEdit={requestFor("edit")}
        onImport={() => toast("Import a CSV from the console.")}
        onMoveToFolder={requestFor("move")}
        removal={removal(actions.removeMaterial, (table) => table.tableId)}
        selection={listing.selection}
        selectionActions={list.selectionActions}
        tables={listing.pagination.visibleRows}
        unauthorizedMessage={undefined}
      />
      {list.overlays}
    </ConsoleListLayout>
  )
}

export function StoresPage() {
  const { actions, state } = useDemoWorkspace()
  const stores = useMemo(() => storeSummaries(state), [state])
  const folders = useMemo(() => folderNames(state), [state])
  const listing = useMaterialListing({
    config: storeListConfig(folders, stores),
    identify: (store) => store.storeId,
    noun: storeNoun,
    rows: stores,
  })
  const [request, setRequest] = useState<MaterialRequest>()
  const editing = useEditing()
  const requestFor = (kind: MaterialRequest["kind"]) => (store: StoreSummary) =>
    setRequest(withMaterial(kind, materialOf(state, store.storeId)))
  const create = () => editing?.create("store", undefined, "store")
  const list = useMaterialListOverlays({
    create: null,
    deleteDescription: storeDeleteDescription,
    identify: (store) => store.storeId,
    noun: storeNoun,
    onCloseRequest: () => setRequest(undefined),
    pagination: listing.pagination,
    request,
    selection: listing.selection,
    toMaterial: (store) => materialOf(state, store.storeId),
  })

  return (
    <ConsoleListLayout>
      <StoresToolbar
        onCreate={create}
        onQueryChange={listing.setQuery}
        query={listing.query}
      />
      <StoreList
        config={listing.config}
        controls={listing.controls}
        folders={folders}
        hasFilters={listing.hasFilters}
        onAccess={requestFor("access")}
        onCreate={create}
        onEdit={requestFor("edit")}
        onMoveToFolder={requestFor("move")}
        removal={removal(actions.removeMaterial, (store) => store.storeId)}
        selection={listing.selection}
        selectionActions={list.selectionActions}
        stores={listing.pagination.visibleRows}
        unauthorizedMessage={undefined}
      />
      {list.overlays}
    </ConsoleListLayout>
  )
}

export function FilesPage() {
  const { actions, state } = useDemoWorkspace()
  const files = useMemo(() => fileRows(state), [state])
  const folders = useMemo(() => folderNames(state), [state])
  const listing = useMaterialListing({
    config: fileListConfig(folders, files),
    identify: (file) => file.fileId,
    noun: fileNoun,
    rows: files,
  })
  const [request, setRequest] = useState<MaterialRequest>()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const requestFor = (kind: MaterialRequest["kind"]) => (file: FileRow) =>
    setRequest(withMaterial(kind, materialOf(state, file.fileId)))
  const upload = () => setIsUploadOpen(true)
  const list = useMaterialListOverlays({
    create: null,
    deleteDescription: fileDeleteDescription,
    identify: (file) => file.fileId,
    noun: fileNoun,
    onCloseRequest: () => setRequest(undefined),
    pagination: listing.pagination,
    request,
    selection: listing.selection,
    toMaterial: (file) => materialOf(state, file.fileId),
  })

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          className="w-fit"
          icon={<Upload />}
          label="Upload file"
          onClick={upload}
          type="button"
        />
      </ConsoleHeaderActions>
      <FileTable
        config={listing.config}
        controls={listing.controls}
        files={listing.pagination.visibleRows}
        folders={folders}
        hasFilters={listing.hasFilters}
        isLoading={false}
        onAccess={requestFor("access")}
        onDelete={(file) => actions.removeMaterial(file.fileId)}
        onEdit={requestFor("edit")}
        onMoveToFolder={requestFor("move")}
        onUpload={upload}
        pendingFileId={undefined}
        selection={listing.selection}
        selectionActions={list.selectionActions}
      />
      {list.overlays}
      <DemoUploadDialog isOpen={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </ConsoleListLayout>
  )
}

function withMaterial(
  kind: MaterialRequest["kind"],
  material: ReturnType<typeof materialOf>
): MaterialRequest | undefined {
  return material === undefined ? undefined : { kind, material }
}

/** Removing lands at once here: nothing is ever archived, so nothing is
 *  ever restored. */
function removal<Row extends { name: string }>(
  remove: (id: string) => void,
  identify: (row: Row) => string
): MaterialRemoval<Row> {
  return {
    removeMaterial: (row) => {
      remove(identify(row))
      toast.success(`Archived ${row.name}.`)

      return Promise.resolve(true)
    },
    removingId: undefined,
    restoreMaterial: () => Promise.resolve(true),
    restoringId: undefined,
  }
}
