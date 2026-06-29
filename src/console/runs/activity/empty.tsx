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
    <div className="grid min-w-0">
      {skeletonRows.map((row, index) => (
        <div
          className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3"
          key={row}
        >
          <div className="relative flex justify-center">
            {index === skeletonRows.length - 1 ? null : (
              <span className="absolute top-7 bottom-0 w-px bg-border" />
            )}
            <Skeleton className="relative z-10 mt-1 size-7 rounded-full" />
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
