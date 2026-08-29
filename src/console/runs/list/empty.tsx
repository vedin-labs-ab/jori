import { FileText } from "lucide-react"
import { FilterableEmptyState } from "../../shared/list/empty"

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <FilterableEmptyState
      description="Runs appear here when Jori picks up work from messages or automations."
      hasFilters={hasFilters}
      icon={FileText}
      noun="runs"
    />
  )
}
