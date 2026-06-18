import { useQuery } from "convex/react"
import { useCallback, useDeferredValue, useEffect, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useClientPagination } from "../shared/list/pagination"
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
      {(organization) => <ArtifactListView tenantId={organization.id} />}
    </ConsolePage>
  )
}

function ArtifactListView({ tenantId }: { tenantId: string }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ArtifactFilter>("active")
  const deletion = useArtifactDeletion(tenantId)
  const now = useNow()
  const deferredQuery = useDeferredValue(query)
  const artifactList = useQuery(api.artifacts.console.list, {
    tenantId,
    query: deferredQuery,
    includeArchived: shouldIncludeArchivedArtifacts(filter),
  })
  const artifacts =
    artifactList?.status === "ready"
      ? filterArtifactsByView(artifactList.artifacts, filter)
      : []
  const hasFilters = hasArtifactFilters(deferredQuery, filter)
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
  })

  if (artifactList === undefined) {
    return (
      <ArtifactLoadingView
        filter={filter}
        query={query}
        onFilterChange={toolbar.setFilter}
        onQueryChange={toolbar.setQuery}
      />
    )
  }

  return (
    <ArtifactReadyView
      artifactList={artifactList}
      artifacts={pagination.visibleRows}
      deletingArtifactId={deletion.deletingArtifactId}
      deleteError={deletion.deleteError}
      filter={filter}
      hasFilters={hasFilters}
      now={now}
      onDelete={deletion.deleteArtifact}
      onRestore={deletion.restoreArtifact}
      pagination={pagination}
      query={query}
      restoringArtifactId={deletion.restoringArtifactId}
      onFilterChange={toolbar.setFilter}
      onQueryChange={toolbar.setQuery}
    />
  )
}

function useResettingArtifactToolbar({
  reset,
  setFilter,
  setQuery,
}: {
  reset: () => void
  setFilter: (value: ArtifactFilter) => void
  setQuery: (value: string) => void
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

  return { setFilter: setFilterAndReset, setQuery: setQueryAndReset }
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)

    return () => window.clearInterval(interval)
  }, [])

  return now
}
