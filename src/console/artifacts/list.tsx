import { Search } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ConsolePageLayout,
  ConsoleScrollableList,
  ConsoleToolbar,
  ConsoleToolbarActions,
} from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import { type useClientPagination } from "../shared/list/pagination"
import { ArtifactSkeletonList, EmptyArtifacts } from "./empty"
import { type ArtifactFilter, artifactFilterOptions } from "./filter"
import { ArtifactRow } from "./row"
import { type ArtifactListResult, type ArtifactSummary } from "./types"

type ArtifactPagination = ReturnType<
  typeof useClientPagination<ArtifactSummary>
>

type ArtifactToolbarProps = {
  filter: ArtifactFilter
  onFilterChange: (value: ArtifactFilter) => void
  onQueryChange: (value: string) => void
  query: string
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
  deleteError,
  filter,
  hasFilters,
  now,
  onDelete,
  onFilterChange,
  onQueryChange,
  onRestore,
  pagination,
  query,
  restoringArtifactId,
}: ArtifactToolbarProps & {
  artifactList: ArtifactListResult
  artifacts: ArtifactSummary[]
  deletingArtifactId: string | undefined
  deleteError: string | undefined
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
        query={query}
      />
      <ArtifactActionError message={deleteError} />
      <ArtifactListBody
        artifactList={artifactList}
        artifacts={artifacts}
        deletingArtifactId={deletingArtifactId}
        hasFilters={hasFilters}
        now={now}
        onDelete={onDelete}
        onRestore={onRestore}
        restoringArtifactId={restoringArtifactId}
      />
      {artifactList.status === "ready" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
    </ConsolePageLayout>
  )
}

function ArtifactActionError({ message }: { message: string | undefined }) {
  if (message === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Could not update artifact</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function ArtifactToolbar({
  filter,
  onFilterChange,
  onQueryChange,
  query,
}: ArtifactToolbarProps) {
  return (
    <ConsoleToolbar>
      <ToggleGroup
        className="flex-wrap justify-start"
        onValueChange={(value) => {
          if (value !== "") {
            onFilterChange(value as ArtifactFilter)
          }
        }}
        type="single"
        value={filter}
        variant="outline"
      >
        {artifactFilterOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ConsoleToolbarActions>
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search artifacts"
            className="pr-2 pl-8"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search artifacts"
            value={query}
          />
        </div>
      </ConsoleToolbarActions>
    </ConsoleToolbar>
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
}: {
  artifactList: ArtifactListResult
  artifacts: ArtifactSummary[]
  deletingArtifactId: string | undefined
  hasFilters: boolean
  now: number
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
  restoringArtifactId: string | undefined
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
