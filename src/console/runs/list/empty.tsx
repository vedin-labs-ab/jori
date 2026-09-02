import { FileText } from "lucide-react"
import { FilterableEmptyState } from "@/shared/console/list/empty"

export function EmptyExecutions({ hasFilters }: { hasFilters: boolean }) {
  return (
    <FilterableEmptyState
      description="Runs appear here when Jori picks up work from messages or jobs."
      hasFilters={hasFilters}
      icon={FileText}
      noun="runs"
    />
  )
}
