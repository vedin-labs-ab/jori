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
import { CreateStoreDialog } from "./create"
import { StoreList, StoreListSkeleton, StoresToolbar } from "./list"
import { useStoreRemoval } from "./manage"
import { type StoreListResult, type StoreSummary } from "./types"

export function StoresPage() {
  return (
    <ConsolePage>
      {(organizationId) => <StoresView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function useStoreRows({
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
  const storeList = useQuery(api.stores.console.list, {
    organizationId,
    query,
    includeArchived: shouldIncludeArchived(filter),
  })
  const stores =
    storeList?.status === "ready"
      ? storeList.stores.filter(
          (store) =>
            matchesArchiveFilter(store.archivedAt, filter) &&
            matchesScopeFilter(store.scope, scope)
        )
      : []

  return { storeList, stores }
}

function StoresView({ organizationId }: { organizationId: string }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ArchiveFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const removal = useStoreRemoval(organizationId)
  const deferredQuery = useDeferredValue(query)
  const { storeList, stores } = useStoreRows({
    filter,
    organizationId,
    query: deferredQuery,
    scope,
  })
  const hasFilters = hasMaterialFilters(query, filter, scope)
  const pagination = useClientPagination({
    hasFilters,
    isReady: storeList?.status === "ready",
    itemLabel: { singular: "store", plural: "stores" },
    items: stores,
  })
  const setFilterAndReset = useResettingSetter(setFilter, pagination.reset)
  const setQueryAndReset = useResettingSetter(setQuery, pagination.reset)
  const setScopeAndReset = useResettingSetter(setScope, pagination.reset)

  return (
    <ConsolePageLayout>
      <StoresToolbar
        filter={filter}
        onCreate={() => setIsCreateOpen(true)}
        onFilterChange={setFilterAndReset}
        onQueryChange={setQueryAndReset}
        onScopeChange={setScopeAndReset}
        query={query}
        scope={scope}
      />
      <StoresBody
        hasFilters={hasFilters}
        onCreate={() => setIsCreateOpen(true)}
        pagination={pagination}
        removal={removal}
        storeList={storeList}
      />
      <CreateStoreDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

function StoresBody({
  hasFilters,
  onCreate,
  pagination,
  removal,
  storeList,
}: {
  hasFilters: boolean
  onCreate: () => void
  pagination: ReturnType<typeof useClientPagination<StoreSummary>>
  removal: ReturnType<typeof useStoreRemoval>
  storeList: StoreListResult | undefined
}) {
  if (storeList === undefined) {
    return (
      <ConsoleScrollableGrid>
        <StoreListSkeleton />
      </ConsoleScrollableGrid>
    )
  }

  return (
    <>
      {/* The list scrolls in place so the pager stays pinned below it,
          matching the other paginated console pages. */}
      <ConsoleScrollableGrid>
        <StoreList
          hasFilters={hasFilters}
          onCreate={onCreate}
          removal={removal}
          stores={pagination.visibleRows}
          unauthorizedMessage={
            storeList.status === "unauthorized" ? storeList.message : undefined
          }
        />
      </ConsoleScrollableGrid>
      {storeList.status === "ready" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
    </>
  )
}
