import { Box } from "lucide-react"
import { ConsoleEmptyState } from "../shared/list/empty"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyArtifacts({ hasFilters }: { hasFilters: boolean }) {
  return (
    <ConsoleEmptyState
      description={
        hasFilters
          ? "Adjust the filters or search to widen the results."
          : "Agent-created apps appear here after they pass validation and publish a version."
      }
      icon={Box}
      title={hasFilters ? "No matching artifacts" : "No artifacts yet"}
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
