import { FileText } from "lucide-react"
import { FilterableEmptyState } from "../../shared/list/empty"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <FilterableEmptyState
      description="Runs appear here when Milo picks up work from messages or automations."
      hasFilters={hasFilters}
      icon={FileText}
      noun="runs"
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
