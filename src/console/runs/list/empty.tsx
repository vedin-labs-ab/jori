import { FileText } from "lucide-react"
import { ConsoleEmptyState } from "../../shared/list/empty"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <ConsoleEmptyState
      description={
        hasFilters
          ? "Adjust the filters or search to widen the results."
          : "Runs appear here when Milo picks up work from messages or automations."
      }
      icon={FileText}
      title={hasFilters ? "No matching runs" : "No runs yet"}
    />
  )
}

export function ExecutionSkeletonList() {
  return (
    <div className="grid gap-2">
      {skeletonRows.map((row) => (
        <div
          className="h-16 rounded-md bg-muted/30 ring-1 ring-foreground/10 ring-inset"
          key={row}
        />
      ))}
    </div>
  )
}
