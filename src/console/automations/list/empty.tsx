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
          {hasFilters
            ? "No automations match this search"
            : "No automations yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Adjust your search or switch to All."
            : "Create an automation for recurring, one-time, or event-triggered work."}
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
