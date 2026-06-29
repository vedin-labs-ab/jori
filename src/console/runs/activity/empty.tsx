import { ListChecks } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

const skeletonRows = ["first", "second", "third"] as const

export function ActivityEmpty() {
  return (
    <Empty className="h-48">
      <EmptyMedia
        className="bg-background text-muted-foreground"
        variant="icon"
      >
        <ListChecks />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No activity yet</EmptyTitle>
        <EmptyDescription>
          Activity appears when the run starts executing.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ActivitySkeleton() {
  return (
    <div className="grid gap-2 p-2">
      {skeletonRows.map((row) => (
        <div className="flex items-start gap-3" key={row}>
          <Skeleton className="mt-1 size-4 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
