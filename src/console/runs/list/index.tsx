import { useSearch } from "@tanstack/react-router"
import { useDeferredValue, useState } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { type AudienceFilter } from "@/shared/console/list/audience"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useResettingSetter } from "@/shared/console/list/pagination"
import { ExecutionFilters } from "@/shared/console/runs/list/filters"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { useExecutionClock } from "@/shared/console/runs/time"
import {
  type ApprovalFilter,
  type RunFilter,
} from "@/shared/console/runs/types"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"
import { usePageSearchSync, useSearchTarget } from "./seek"
import { useRunRowSlots } from "./slots"

/** The Activity page: the filters, the rows they narrow, and the pager,
 *  over cursor pagination that the URL's page and run deep links steer. */
export function RunsList({ organizationId }: { organizationId: string }) {
  const { run: focusRunId } = useSearch({ from: "/runs" })
  const target = useSearchTarget()
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("any")
  const [runFilter, setRunFilter] = useState<RunFilter>("all")
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all")
  const [query, setQuery] = useState("")
  const deferredApprovalFilter = useDeferredValue(approvalFilter)
  const deferredRunFilter = useDeferredValue(runFilter)
  const deferredAudienceFilter = useDeferredValue(audienceFilter)
  const deferredQuery = useDeferredValue(query)
  const pagination = useExecutionPagination(
    {
      approvalFilter: deferredApprovalFilter,
      audienceFilter: deferredAudienceFilter,
      organizationId,
      query: deferredQuery,
      runFilter: deferredRunFilter,
    },
    target
  )

  usePageSearchSync(pagination.pageIndex)
  const setApprovalFilterAndReset = useResettingSetter(
    setApprovalFilter,
    pagination.reset
  )
  const setRunFilterAndReset = useResettingSetter(
    setRunFilter,
    pagination.reset
  )
  const setAudienceFilterAndReset = useResettingSetter(
    setAudienceFilter,
    pagination.reset
  )
  const setQueryAndReset = useResettingSetter(setQuery, pagination.reset)

  return (
    <ExecutionFilters
      approvalFilter={approvalFilter}
      audienceFilter={audienceFilter}
      query={query}
      runFilter={runFilter}
      setApprovalFilter={setApprovalFilterAndReset}
      setAudienceFilter={setAudienceFilterAndReset}
      setQuery={setQueryAndReset}
      setRunFilter={setRunFilterAndReset}
    >
      <ConsolePageLayout>
        <RunRows
          focusRunId={focusRunId}
          organizationId={organizationId}
          pagination={pagination}
          showAudience={deferredAudienceFilter === "all"}
        />
        <ConsoleListPager pagination={pagination} />
      </ConsolePageLayout>
    </ExecutionFilters>
  )
}

/** The rows bound to the organization: the page's clock, and each row's
 *  detail and stop control talking to Convex. Below the list, so the
 *  clock's ticks re-render the rows alone. */
function RunRows({
  focusRunId,
  pagination,
  showAudience,
  organizationId,
}: {
  focusRunId?: string
  pagination: ExecutionPagination
  showAudience: boolean
  organizationId: string
}) {
  const now = useExecutionClock(pagination.visibleRows)
  const slots = useRunRowSlots(organizationId)

  return (
    <ExecutionRows
      {...slots}
      focusRunId={focusRunId}
      hasFilters={pagination.hasFilters}
      isLoading={pagination.isLoadingFirstPage}
      now={now}
      rows={pagination.visibleRows}
      showAudience={showAudience}
    />
  )
}
