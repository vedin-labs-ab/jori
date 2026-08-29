import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { SelectionActionsBar } from "../shared/list/bar"
import { ConsoleListFooter, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { matchesScopeFilter, type ScopeFilter } from "../shared/list/scope"
import { type RowSelection, useRowSelection } from "../shared/list/selection"
import {
  type ArchiveFilter,
  hasMaterialFilters,
  matchesArchiveFilter,
  shouldIncludeArchived,
} from "../shared/materials/archive"
import { useFolderNames } from "../shared/materials/folders"
import { bulkMaterialRemoval } from "../shared/materials/removal"
import { CreateTableDialog } from "./create"
import { ImportTableDialog } from "./import/dialog"
import { TableList, TableListSkeleton, TablesToolbar } from "./list"
import {
  tableDeleteDescription,
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

function useTableRows({
  filter,
  organizationId,
  query,
  scope,
}: {
  filter: ArchiveFilter
  organizationId: string
  query: string
  scope: ScopeFilter
}) {
  const tableList = useQuery(api.tables.console.list, {
    organizationId,
    query,
    includeArchived: shouldIncludeArchived(filter),
  })
  const tables =
    tableList?.status === "ready"
      ? tableList.tables.filter(
          (table) =>
            matchesArchiveFilter(table.archivedAt, filter) &&
            matchesScopeFilter(table.scope, scope)
        )
      : []

  return { tableList, tables }
}

/** One bag of page state, so the view and its overlays stay small. */
function useTablesPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ArchiveFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [dialog, setDialog] = useState<"create" | "import">()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const removal = useTableRemoval(organizationId)
  const deferredQuery = useDeferredValue(query)
  const { tableList, tables } = useTableRows({
    filter,
    organizationId,
    query: deferredQuery,
    scope,
  })
  const hasFilters = hasMaterialFilters(query, filter, scope)
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
    dialog,
    filter,
    folders: useFolderNames(organizationId),
    hasFilters,
    moving,
    pagination,
    query,
    removal,
    scope,
    selection,
    setDialog,
    setFilterAndReset: useResettingSetter(setFilter, pagination.reset),
    setMoving,
    setQueryAndReset: useResettingSetter(setQuery, pagination.reset),
    setScopeAndReset: useResettingSetter(setScope, pagination.reset),
    tableList,
  }
}

function TablesView({ organizationId }: { organizationId: string }) {
  const page = useTablesPage(organizationId)

  return (
    <ConsoleListLayout>
      <TablesToolbar
        filter={page.filter}
        onCreate={() => page.setDialog("create")}
        onFilterChange={page.setFilterAndReset}
        onImport={() => page.setDialog("import")}
        onQueryChange={page.setQueryAndReset}
        onScopeChange={page.setScopeAndReset}
        query={page.query}
        scope={page.scope}
      />
      <TablesBody
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
    return <TableListSkeleton />
  }

  return (
    <>
      <TableList
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
