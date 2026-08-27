import { CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterableEmptyState } from "../../shared/list/empty"

const skeletonRows = ["first", "second", "third"]

export function EmptyAutomations({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean
  onCreate: () => void
}) {
  return (
    <FilterableEmptyState
      action={
        <Button onClick={onCreate} type="button">
          <Plus />
          New automation
        </Button>
      }
      description="Create an automation for recurring, one-time, or event-triggered work."
      hasFilters={hasFilters}
      icon={CalendarClock}
      noun="automations"
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
