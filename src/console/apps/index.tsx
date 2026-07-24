import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { matchesScopeFilter, type ScopeFilter } from "../shared/list/scope"
import { useNow } from "../shared/time"
import { useAppDeletion } from "./deletion"
import {
  type AppFilter,
  filterAppsByView,
  hasAppFilters,
  shouldIncludeArchivedApps,
} from "./filter"
import { AppLoadingView, AppReadyView } from "./list"

export function Apps() {
  return (
    <ConsolePage>
      {(organizationId) => <AppListView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function useAppRows({
  filter,
  query,
  scope,
  organizationId,
}: {
  filter: AppFilter
  query: string
  scope: ScopeFilter
  organizationId: string
}) {
  const appList = useQuery(api.apps.console.list, {
    organizationId,
    query,
    includeArchived: shouldIncludeArchivedApps(filter),
  })
  const apps =
    appList?.status === "ready"
      ? filterAppsByView(appList.apps, filter).filter((app) =>
          matchesScopeFilter(app.access, scope)
        )
      : []
  const hasFilters = hasAppFilters(query, filter) || scope !== "all"

  return { appList, apps, hasFilters }
}

function useAppFilters() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<AppFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")

  return { filter, query, scope, setFilter, setQuery, setScope }
}

function AppListView({ organizationId }: { organizationId: string }) {
  const { filter, query, scope, setFilter, setQuery, setScope } =
    useAppFilters()
  const deletion = useAppDeletion(organizationId)
  const now = useNow(60_000)
  const deferredQuery = useDeferredValue(query)
  const { appList, apps, hasFilters } = useAppRows({
    filter,
    query: deferredQuery,
    scope,
    organizationId,
  })
  const pagination = useClientPagination({
    hasFilters,
    isReady: appList?.status === "ready",
    itemLabel: { singular: "app", plural: "apps" },
    items: apps,
  })
  const setFilterAndReset = useResettingSetter(setFilter, pagination.reset)
  const setQueryAndReset = useResettingSetter(setQuery, pagination.reset)
  const setScopeAndReset = useResettingSetter(setScope, pagination.reset)

  if (appList === undefined) {
    return (
      <AppLoadingView
        filter={filter}
        query={query}
        scope={scope}
        onFilterChange={setFilterAndReset}
        onQueryChange={setQueryAndReset}
        onScopeChange={setScopeAndReset}
      />
    )
  }

  return (
    <AppReadyView
      appList={appList}
      apps={pagination.visibleRows}
      deletingAppId={deletion.deletingAppId}
      filter={filter}
      hasFilters={hasFilters}
      now={now}
      onDelete={deletion.deleteApp}
      onRestore={deletion.restoreApp}
      pagination={pagination}
      query={query}
      restoringAppId={deletion.restoringAppId}
      scope={scope}
      onFilterChange={setFilterAndReset}
      onQueryChange={setQueryAndReset}
      onScopeChange={setScopeAndReset}
    />
  )
}
