import { ListChecks } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RunRowContent,
  RunRowControl,
  RunRowFrame,
  RunRowHeader,
  RunRowMeta,
} from "../row/layout"

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
        <RunRowFrame className="bg-background/80" key={row}>
          <RunRowHeader>
            <RunRowControl>
              <Skeleton className="size-4 rounded-full" />
              <RunRowContent title={<Skeleton className="h-4 w-40" />}>
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-24" />
              </RunRowContent>
              <RunRowMeta>
                <Skeleton className="h-6 w-16 rounded-md" />
              </RunRowMeta>
            </RunRowControl>
          </RunRowHeader>
        </RunRowFrame>
      ))}
    </div>
  )
}
