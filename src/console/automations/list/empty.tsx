import { CalendarClock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ConsoleEmptyState } from "../../shared/list/empty"

const skeletonRows = ["first", "second", "third"]

export function EmptyAutomations({ hasFilters }: { hasFilters: boolean }) {
  return (
    <ConsoleEmptyState
      description={
        hasFilters
          ? "Adjust the filters or search to widen the results."
          : "Create an automation for recurring, one-time, or event-triggered work."
      }
      icon={CalendarClock}
      title={hasFilters ? "No matching automations" : "No automations yet"}
    />
  )
}

export function AutomationSkeletonList() {
  return (
    <>
      {skeletonRows.map((row) => (
        <li className="min-w-0" key={row}>
          <Skeleton className="h-40 w-full rounded-lg" />
        </li>
      ))}
    </>
  )
}
