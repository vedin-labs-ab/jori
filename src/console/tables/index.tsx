import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
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
  const [isCreateOpen, setIsCreateOpen] = useState(false)
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
        onCreate={() => setIsCreateOpen(true)}
        onFilterChange={setFilterAndReset}
        onQueryChange={setQueryAndReset}
        onScopeChange={setScopeAndReset}
        query={query}
        scope={scope}
      />
      <TablesBody
        hasFilters={hasFilters}
        pagination={pagination}
        removal={removal}
        tableList={tableList}
      />
      <CreateTableDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

function TablesBody({
  hasFilters,
  pagination,
  removal,
  tableList,
}: {
  hasFilters: boolean
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
