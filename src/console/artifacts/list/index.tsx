import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsolePageLayout,
  ConsoleScrollableList,
  ConsoleSearch,
} from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { type useClientPagination } from "../../shared/list/pagination"
import { type ScopeFilter, scopeFilterOptions } from "../../shared/list/scope"
import { type ArtifactFilter, artifactFilterOptions } from "../filter"
import { type ArtifactListResult, type ArtifactSummary } from "../types"
import { ArtifactSkeletonList, EmptyArtifacts } from "./empty"
import { ArtifactRow } from "./row"

type ArtifactPagination = ReturnType<
  typeof useClientPagination<ArtifactSummary>
>

type ArtifactToolbarProps = {
  filter: ArtifactFilter
  onFilterChange: (value: ArtifactFilter) => void
  onQueryChange: (value: string) => void
  onScopeChange: (value: ScopeFilter) => void
  query: string
  scope: ScopeFilter
}

export function ArtifactLoadingView(props: ArtifactToolbarProps) {
  return (
    <ConsolePageLayout>
      <ArtifactToolbar {...props} />
      <ArtifactLoadingState />
    </ConsolePageLayout>
  )
}

export function ArtifactReadyView({
  artifactList,
  artifacts,
  deletingArtifactId,
  filter,
  hasFilters,
  now,
  onDelete,
  onFilterChange,
  onQueryChange,
  onRestore,
  onScopeChange,
  pagination,
  query,
  restoringArtifactId,
  scope,
}: ArtifactToolbarProps & {
  artifactList: ArtifactListResult
  artifacts: ArtifactSummary[]
  deletingArtifactId: string | undefined
  hasFilters: boolean
  now: number
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
  pagination: ArtifactPagination
  restoringArtifactId: string | undefined
}) {
  return (
    <ConsolePageLayout>
      <ArtifactToolbar
        filter={filter}
        onFilterChange={onFilterChange}
        onQueryChange={onQueryChange}
        onScopeChange={onScopeChange}
        query={query}
        scope={scope}
      />
      <ArtifactListBody
        artifactList={artifactList}
        artifacts={artifacts}
        deletingArtifactId={deletingArtifactId}
        hasFilters={hasFilters}
        now={now}
        onDelete={onDelete}
        onRestore={onRestore}
        restoringArtifactId={restoringArtifactId}
        showScope={scope === "all"}
      />
      {artifactList.status === "ready" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
    </ConsolePageLayout>
  )
}

function ArtifactToolbar({
  filter,
  onFilterChange,
  onQueryChange,
  onScopeChange,
  query,
  scope,
}: ArtifactToolbarProps) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search artifacts"
          onValueChange={onQueryChange}
          value={query}
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={onFilterChange}
          options={artifactFilterOptions}
          value={filter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={onScopeChange}
          options={scopeFilterOptions}
          value={scope}
        />
      </ConsoleFilterGroup>
    </>
  )
}

function ArtifactListBody({
  artifactList,
  artifacts,
  deletingArtifactId,
  hasFilters,
  now,
  onDelete,
  onRestore,
  restoringArtifactId,
  showScope,
}: {
  artifactList: ArtifactListResult
  artifacts: ArtifactSummary[]
  deletingArtifactId: string | undefined
  hasFilters: boolean
  now: number
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
  restoringArtifactId: string | undefined
  showScope: boolean
}) {
  if (artifactList.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load artifacts</AlertTitle>
        <AlertDescription>{artifactList.message}</AlertDescription>
      </Alert>
    )
  }

  if (artifacts.length === 0) {
    return (
      <ConsoleScrollableList className="pb-2">
        <li>
          <EmptyArtifacts hasFilters={hasFilters} />
        </li>
      </ConsoleScrollableList>
    )
  }

  return (
    <ConsoleScrollableList className="pb-2">
      {artifacts.map((artifact) => (
        <ArtifactRow
          artifact={artifact}
          isDeleting={deletingArtifactId === artifact.artifactId}
          isRestoring={restoringArtifactId === artifact.artifactId}
          key={artifact.artifactId}
          now={now}
          onDelete={onDelete}
          onRestore={onRestore}
          showScope={showScope}
        />
      ))}
    </ConsoleScrollableList>
  )
}

function ArtifactLoadingState() {
  return (
    <ConsoleScrollableList className="pb-2">
      <ArtifactSkeletonList />
    </ConsoleScrollableList>
  )
}
