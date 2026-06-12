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

export function EmptyAutomations({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Empty className="min-h-48 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarClock />
        </EmptyMedia>
        <EmptyTitle>
          {hasFilters ? "No matching automations" : "No automations yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Adjust the search or include completed automations."
            : "Create an automation to give Milo recurring, one-time, or event-based work."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function AutomationSkeletonList() {
  return (
    <div className="grid gap-2">
      {skeletonRows.map((row) => (
        <Skeleton className="h-20 w-full rounded-md" key={row} />
      ))}
    </div>
  )
}
