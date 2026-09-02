import { FileText } from "lucide-react"
import { FilterableEmptyState } from "../../list/empty"

export function RunsEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <FilterableEmptyState
      description="Runs appear here when Jori picks up work from messages or jobs."
      hasFilters={hasFilters}
      icon={FileText}
      noun="runs"
    />
  )
}
