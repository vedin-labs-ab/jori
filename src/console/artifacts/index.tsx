import { useQuery } from "convex/react"
import { useCallback, useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useClientPagination } from "../shared/list/pagination"
import { matchesScopeFilter, type ScopeFilter } from "../shared/list/scope"
import { useNow } from "../shared/time"
import { useArtifactDeletion } from "./deletion"
import {
  type ArtifactFilter,
  filterArtifactsByView,
  hasArtifactFilters,
  shouldIncludeArchivedArtifacts,
} from "./filter"
import { ArtifactLoadingView, ArtifactReadyView } from "./list"

export function Artifacts() {
  return (
    <ConsolePage>
      {(tenantId) => <ArtifactListView tenantId={tenantId} />}
    </ConsolePage>
  )
}

function useArtifactRows({
  filter,
  query,
  scope,
  tenantId,
}: {
  filter: ArtifactFilter
  query: string
  scope: ScopeFilter
  tenantId: string
}) {
  const artifactList = useQuery(api.artifacts.console.list, {
    tenantId,
    query,
    includeArchived: shouldIncludeArchivedArtifacts(filter),
  })
  const artifacts =
    artifactList?.status === "ready"
      ? filterArtifactsByView(artifactList.artifacts, filter).filter(
          (artifact) => matchesScopeFilter(artifact.access, scope)
        )
      : []
  const hasFilters = hasArtifactFilters(query, filter) || scope !== "all"

  return { artifactList, artifacts, hasFilters }
}

function useArtifactFilters() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ArtifactFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")

  return { filter, query, scope, setFilter, setQuery, setScope }
}

function ArtifactListView({ tenantId }: { tenantId: string }) {
  const { filter, query, scope, setFilter, setQuery, setScope } =
    useArtifactFilters()
  const deletion = useArtifactDeletion(tenantId)
  const now = useNow(60_000)
  const deferredQuery = useDeferredValue(query)
  const { artifactList, artifacts, hasFilters } = useArtifactRows({
    filter,
    query: deferredQuery,
    scope,
    tenantId,
  })
  const pagination = useClientPagination({
    hasFilters,
    isReady: artifactList?.status === "ready",
    itemLabel: { singular: "artifact", plural: "artifacts" },
    items: artifacts,
  })
  const toolbar = useResettingArtifactToolbar({
    reset: pagination.reset,
    setFilter,
    setQuery,
    setScope,
  })

  if (artifactList === undefined) {
    return (
      <ArtifactLoadingView
        filter={filter}
        query={query}
        scope={scope}
        onFilterChange={toolbar.setFilter}
        onQueryChange={toolbar.setQuery}
        onScopeChange={toolbar.setScope}
      />
    )
  }

  return (
    <ArtifactReadyView
      artifactList={artifactList}
      artifacts={pagination.visibleRows}
      deletingArtifactId={deletion.deletingArtifactId}
      filter={filter}
      hasFilters={hasFilters}
      now={now}
      onDelete={deletion.deleteArtifact}
      onRestore={deletion.restoreArtifact}
      pagination={pagination}
      query={query}
      restoringArtifactId={deletion.restoringArtifactId}
      scope={scope}
      onFilterChange={toolbar.setFilter}
      onQueryChange={toolbar.setQuery}
      onScopeChange={toolbar.setScope}
    />
  )
}

function useResettingArtifactToolbar({
  reset,
  setFilter,
  setQuery,
  setScope,
}: {
  reset: () => void
  setFilter: (value: ArtifactFilter) => void
  setQuery: (value: string) => void
  setScope: (value: ScopeFilter) => void
}) {
  const setQueryAndReset = useCallback(
    (value: string) => {
      setQuery(value)
      reset()
    },
    [reset, setQuery]
  )
  const setFilterAndReset = useCallback(
    (value: ArtifactFilter) => {
      setFilter(value)
      reset()
    },
    [reset, setFilter]
  )
  const setScopeAndReset = useCallback(
    (value: ScopeFilter) => {
      setScope(value)
      reset()
    },
    [reset, setScope]
  )

  return {
    setFilter: setFilterAndReset,
    setQuery: setQueryAndReset,
    setScope: setScopeAndReset,
  }
}
