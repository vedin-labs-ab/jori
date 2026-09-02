import { Plus, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FilterableEmptyState } from "@/shared/console/list/empty"

export function JobsEmptyState({
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
          New job
        </Button>
      }
      description="Create a job for recurring, one-time, or event-triggered work."
      hasFilters={hasFilters}
      icon={Workflow}
      noun="jobs"
    />
  )
}
