import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { ConsolePageLayout, ConsoleScrollableGrid } from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { matchesScopeFilter, type ScopeFilter } from "../shared/list/scope"
import {
  type ArchiveFilter,
  hasMaterialFilters,
  matchesArchiveFilter,
  shouldIncludeArchived,
} from "../shared/materials/archive"
import { CreateTableDialog } from "./create"
import { ImportTableDialog } from "./import/dialog"
import { TableList, TableListSkeleton, TablesToolbar } from "./list"
import { useTableRemoval } from "./manage"
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

function TablesView({ organizationId }: { organizationId: string }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ArchiveFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [dialog, setDialog] = useState<"create" | "import">()
  const [movingTable, setMovingTable] = useState<TableSummary>()
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
    itemLabel: { singular: "table", plural: "tables" },
    items: tables,
  })
  const setFilterAndReset = useResettingSetter(setFilter, pagination.reset)
  const setQueryAndReset = useResettingSetter(setQuery, pagination.reset)
  const setScopeAndReset = useResettingSetter(setScope, pagination.reset)

  return (
    <ConsolePageLayout>
      <TablesToolbar
        filter={filter}
        onCreate={() => setDialog("create")}
        onFilterChange={setFilterAndReset}
        onImport={() => setDialog("import")}
        onQueryChange={setQueryAndReset}
        onScopeChange={setScopeAndReset}
        query={query}
        scope={scope}
      />
      <TablesBody
        hasFilters={hasFilters}
        onCreate={() => setDialog("create")}
        onImport={() => setDialog("import")}
        onMoveToFolder={setMovingTable}
        pagination={pagination}
        removal={removal}
        tableList={tableList}
      />
      <TablesDialogs
        dialog={dialog}
        movingTable={movingTable}
        onDialogChange={setDialog}
        onMoveClose={() => setMovingTable(undefined)}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

function TablesDialogs({
  dialog,
  movingTable,
  onDialogChange,
  onMoveClose,
  organizationId,
}: {
  dialog: "create" | "import" | undefined
  movingTable: TableSummary | undefined
  onDialogChange: (dialog: "create" | "import" | undefined) => void
  onMoveClose: () => void
  organizationId: string
}) {
  return (
    <>
      <CreateTableDialog
        isOpen={dialog === "create"}
        onOpenChange={(open) => onDialogChange(open ? "create" : undefined)}
        organizationId={organizationId}
      />
      <ImportTableDialog
        isOpen={dialog === "import"}
        onOpenChange={(open) => onDialogChange(open ? "import" : undefined)}
        organizationId={organizationId}
      />
      <MoveResourceDialog
        onClose={onMoveClose}
        organizationId={organizationId}
        resource={movingResource(movingTable)}
      />
    </>
  )
}

function movingResource(table: TableSummary | undefined) {
  return table === undefined
    ? undefined
    : {
        resourceType: "collection" as const,
        resourceId: table.tableId,
        name: table.name,
        folderId: table.folderId,
      }
}

function TablesBody({
  hasFilters,
  onCreate,
  onImport,
  onMoveToFolder,
  pagination,
  removal,
  tableList,
}: {
  hasFilters: boolean
  onCreate: () => void
  onImport: () => void
  onMoveToFolder: (table: TableSummary) => void
  pagination: ReturnType<typeof useClientPagination<TableSummary>>
  removal: ReturnType<typeof useTableRemoval>
  tableList: TableListResult | undefined
}) {
  if (tableList === undefined) {
    return (
      <ConsoleScrollableGrid>
        <TableListSkeleton />
      </ConsoleScrollableGrid>
    )
  }

  return (
    <>
      {/* The list scrolls in place so the pager stays pinned below it,
          matching the other paginated console pages. */}
      <ConsoleScrollableGrid>
        <TableList
          hasFilters={hasFilters}
          onCreate={onCreate}
          onImport={onImport}
          onMoveToFolder={onMoveToFolder}
          removal={removal}
          tables={pagination.visibleRows}
          unauthorizedMessage={
            tableList.status === "unauthorized" ? tableList.message : undefined
          }
        />
      </ConsoleScrollableGrid>
      {tableList.status === "ready" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
    </>
  )
}
