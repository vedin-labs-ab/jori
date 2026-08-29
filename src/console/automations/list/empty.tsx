import { CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FilterableEmptyState } from "../../shared/list/empty"

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
