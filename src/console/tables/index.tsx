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
import { CreateTableDialog } from "./create"
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

function useTableRows(organizationId: string, query: string) {
  const tableList = useQuery(api.tables.console.list, {
    organizationId,
    query,
    includeArchived: false,
  })

  return {
    tableList,
    rows: tableList?.status === "ready" ? tableList.tables : [],
  }
}

/** One bag of page state, so the view and its overlays stay small. */
function useTablesPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [dialog, setDialog] = useState<"create" | "import">()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const removal = useTableRemoval(organizationId)
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const { tableList, rows } = useTableRows(organizationId, deferredQuery)
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
    folders,
    hasFilters,
    moving,
    pagination,
    query,
    removal,
    selection,
    setDialog,
    setMoving,
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
        onCreate={() => page.setDialog("create")}
        onImport={() => page.setDialog("import")}
        onMoveToFolder={(table) => page.setMoving([toMoveTarget(table)])}
        pagination={page.pagination}
        removal={page.removal}
        selection={page.selection}
        tableList={page.tableList}
      />
      <TablesOverlays organizationId={organizationId} page={page} />
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
  onCreate,
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
  onCreate: () => void
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
        onCreate={onCreate}
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
