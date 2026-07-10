import { Box } from "lucide-react"
import { FilterableEmptyState } from "../../shared/list/empty"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyArtifacts({ hasFilters }: { hasFilters: boolean }) {
  return (
    <FilterableEmptyState
      description="Agent-created apps appear here after they pass validation and publish a version."
      hasFilters={hasFilters}
      icon={Box}
      noun="artifacts"
    />
  )
}

export function ArtifactSkeletonList() {
  return (
    <>
      {skeletonRows.map((row) => (
        <li className="min-w-0" key={row}>
          <div className="h-16 rounded-md bg-muted/30 ring-1 ring-foreground/10 ring-inset" />
        </li>
      ))}
    </>
  )
}
