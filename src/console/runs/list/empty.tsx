import { FileText } from "lucide-react"

const skeletonRows = ["first", "second", "third", "fourth"]

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid min-h-48 place-items-center p-6 text-center">
      <div className="grid max-w-sm gap-2">
        <FileText className="mx-auto size-6 text-muted-foreground" />
        <h2 className="font-medium text-sm">
          {hasFilters ? "No matching runs" : "No runs yet"}
        </h2>
        <p className="text-muted-foreground text-xs">
          {hasFilters
            ? "Adjust the filters or search to widen the results."
            : "Runs appear here when Milo picks up work from messages or automations."}
        </p>
      </div>
    </div>
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
