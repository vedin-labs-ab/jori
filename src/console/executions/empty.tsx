import { FileText } from "lucide-react"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid min-h-48 place-items-center p-6 text-center">
      <div className="grid max-w-sm gap-2">
        <FileText className="mx-auto size-6 text-muted-foreground" />
        <h2 className="font-medium text-sm">
          {hasFilters ? "No matching executions" : "No executions yet"}
        </h2>
        <p className="text-muted-foreground text-xs">
          {hasFilters
            ? "Adjust the filters or load more rows to widen the search."
            : "Executions will appear here when messages or schedules start runs."}
        </p>
      </div>
    </div>
  )
}

export function ExecutionSkeletonList() {
  return (
    <div className="grid gap-2">
      {skeletonRows.map((row) => (
        <div className="h-16 rounded-md border bg-muted/30" key={row} />
      ))}
    </div>
  )
}
