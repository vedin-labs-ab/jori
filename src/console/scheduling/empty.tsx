import { CalendarClock } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

const skeletonRows = ["first", "second", "third"]

export function EmptySchedules({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Empty className="min-h-48 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarClock />
        </EmptyMedia>
        <EmptyTitle>
          {hasFilters ? "No matching schedules" : "No schedules yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Adjust the search or include completed schedules."
            : "Create a schedule to give Milo recurring or one-time work."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ScheduleSkeletonList() {
  return (
    <div className="grid gap-2">
      {skeletonRows.map((row) => (
        <Skeleton className="h-20 w-full rounded-md" key={row} />
      ))}
    </div>
  )
}
