import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { SelectionActionsBar } from "../shared/list/bar"
import {
  type ListConfig,
  type ListControls,
  resettingControls,
  useListControls,
} from "../shared/list/controls"
import { ConsoleListFooter, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { type RowSelection, useRowSelection } from "../shared/list/selection"
import { useFolderNames } from "../shared/materials/folders"
import { bulkMaterialRemoval } from "../shared/materials/removal"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { CreateTableDialog } from "./create"
import { EditTableDialog } from "./edit"
import { ImportTableDialog } from "./import/dialog"
import { TableList, TablesToolbar } from "./list"
import {
  tableDeleteDescription,
  tableListConfig,
  tableNoun,
  useTableBulk,
  useTableRemoval,
} from "./manage"
import { type TableListResult, type TableSummary } from "./types"

export function TablesPage() {
  return (
    <ConsolePage>
      {(organizationId) => <TablesView organizationId={organizationId} />}
    </ConsolePage>
  )
}

/** One bag of page state, so the view and its overlays stay small. */
function useTablesPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<"create" | "import">()
  const [editing, setEditing] = useState<TableSummary>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const [sharing, setSharing] = useState<TableSummary>()
  const removal = useTableRemoval(organizationId)
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const tableList = useQuery(api.tables.console.list, {
    organizationId,
    query: deferredQuery,
    includeArchived: false,
  })
  const rows = tableList?.status === "ready" ? tableList.tables : []
  const config = tableListConfig(folders, rows)
  const controls = useListControls(config)
  const tables = controls.apply(rows)
  const hasFilters = query.trim() !== "" || controls.hasActiveControls
  const pagination = useClientPagination({
    hasFilters,
    isReady: tableList?.status === "ready",
    itemLabel: tableNoun,
    items: tables,
  })
  const selection = useRowSelection({
    identify: (table: TableSummary) => table.tableId,
    rows: pagination.visibleRows,
  })

  return {
    bulk: useTableBulk(organizationId, selection),
    config,
    controls: resettingControls(controls, pagination.reset),
    dialog,
    editing,
    folders,
    hasFilters,
    moving,
    pagination,
    query,
    removal,
    selection,
    setDialog,
    setEditing,
    setMoving,
    setSharing,
    sharing,
    setQueryAndReset: useResettingSetter(setQuery, pagination.reset),
    tableList,
  }
}

function TablesView({ organizationId }: { organizationId: string }) {
  const page = useTablesPage(organizationId)

  return (
    <ConsoleListLayout>
      <TablesToolbar
        onCreate={() => page.setDialog("create")}
        onImport={() => page.setDialog("import")}
        onQueryChange={page.setQueryAndReset}
        query={page.query}
      />
      <TablesBody
        config={page.config}
        controls={page.controls}
        folders={page.folders}
        hasFilters={page.hasFilters}
        onAccess={page.setSharing}
        onCreate={() => page.setDialog("create")}
        onEdit={page.setEditing}
        onImport={() => page.setDialog("import")}
        onMoveToFolder={(table) => page.setMoving([toMoveTarget(table)])}
        pagination={page.pagination}
        removal={page.removal}
        selection={page.selection}
        tableList={page.tableList}
      />
      <TablesOverlays organizationId={organizationId} page={page} />
      <TableRowDialogs organizationId={organizationId} page={page} />
    </ConsoleListLayout>
  )
}

/** The selection bar and the page's dialogs — everything that floats over
 *  the list. */
function TablesOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useTablesPage>
}) {
  return (
    <>
      <SelectionActionsBar
        count={page.selection.count}
        isBusy={page.bulk.isBusy}
        noun={tableNoun}
        onClear={page.selection.clear}
        onDownload={page.bulk.downloadSelected}
        onMove={() => page.setMoving(page.selection.selected.map(toMoveTarget))}
        onRemove={page.bulk.removeSelected}
        removal={bulkMaterialRemoval(
          page.selection.selected,
          tableNoun,
          tableDeleteDescription
        )}
      />
      <CreateTableDialog
        isOpen={page.dialog === "create"}
        onOpenChange={(open) => page.setDialog(open ? "create" : undefined)}
        organizationId={organizationId}
      />
      <ImportTableDialog
        isOpen={page.dialog === "import"}
        onOpenChange={(open) => page.setDialog(open ? "import" : undefined)}
        organizationId={organizationId}
      />
      <MoveResourcesDialog
        onClose={() => page.setMoving(undefined)}
        organizationId={organizationId}
        resources={page.moving}
      />
    </>
  )
}

/** What a row's Edit details and Sharing… open, hosted once for the list. */
function TableRowDialogs({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useTablesPage>
}) {
  return (
    <>
      <EditTableDialog
        onOpenChange={(open) => {
          if (!open) {
            page.setEditing(undefined)
          }
        }}
        organizationId={organizationId}
        table={page.editing}
      />
      {page.sharing === undefined ? null : (
        <VisibilityDialog
          noun="table"
          onOpenChange={(open) => {
            if (!open) {
              page.setSharing(undefined)
            }
          }}
          open
          organizationId={organizationId}
          ownerId={page.sharing.ownerId}
          target={{ kind: "table", id: page.sharing.tableId }}
          value={page.sharing.visibility}
        />
      )}
    </>
  )
}

function toMoveTarget(table: TableSummary): MoveResourceTarget {
  return {
    resourceType: "collection",
    resourceId: table.tableId,
    name: table.name,
    folderId: table.folderId,
  }
}

function TablesBody({
  config,
  controls,
  folders,
  hasFilters,
  onAccess,
  onCreate,
  onEdit,
  onImport,
  onMoveToFolder,
  pagination,
  removal,
  selection,
  tableList,
}: {
  config: ListConfig<TableSummary>
  controls: ListControls
  folders: ReturnType<typeof useFolderNames>
  hasFilters: boolean
  onAccess: (table: TableSummary) => void
  onCreate: () => void
  onEdit: (table: TableSummary) => void
  onImport: () => void
  onMoveToFolder: (table: TableSummary) => void
  pagination: ReturnType<typeof useClientPagination<TableSummary>>
  removal: ReturnType<typeof useTableRemoval>
  selection: RowSelection<TableSummary>
  tableList: TableListResult | undefined
}) {
  if (tableList === undefined) {
    return <ConsoleListLoading />
  }

  return (
    <>
      <TableList
        config={config}
        controls={controls}
        folders={folders}
        hasFilters={hasFilters}
        onAccess={onAccess}
        onCreate={onCreate}
        onEdit={onEdit}
        onImport={onImport}
        onMoveToFolder={onMoveToFolder}
        removal={removal}
        selection={selection}
        tables={pagination.visibleRows}
        unauthorizedMessage={
          tableList.status === "unauthorized" ? tableList.message : undefined
        }
      />
      {tableList.status === "ready" ? (
        <ConsoleListFooter>
          <ConsoleListPager pagination={pagination} />
        </ConsoleListFooter>
      ) : null}
    </>
  )
}
