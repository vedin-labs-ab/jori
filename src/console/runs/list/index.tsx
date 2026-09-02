import { useSearch } from "@tanstack/react-router"
import { lazy, useDeferredValue, useMemo, useState } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { type AudienceFilter } from "@/shared/console/list/audience"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useResettingSetter } from "@/shared/console/list/pagination"
import { ExecutionFilters } from "@/shared/console/runs/list/filters"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { type RunRowSlots } from "@/shared/console/runs/row"
import { useExecutionClock } from "@/shared/console/runs/time"
import {
  type ApprovalFilter,
  type RunFilter,
} from "@/shared/console/runs/types"
import { StopExecution } from "../row/stop"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"
import { usePageSearchSync, useSearchTarget } from "./seek"

let expandedRunModule: Promise<typeof import("../row/expanded")> | undefined

function loadExpandedRun() {
  expandedRunModule ??= import("../row/expanded")
  return expandedRunModule
}

function preloadExpandedRun() {
  void loadExpandedRun()
}

const ExpandedRun = lazy(async () => ({
  default: (await loadExpandedRun()).ExpandedRun,
}))

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
    organizationId,
    deferredRunFilter,
    deferredApprovalFilter,
    deferredAudienceFilter,
    deferredQuery,
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

/** The row slots for one organization, held steady across ticks of the
 *  clock so a memoized row re-renders for its own run alone: the detail
 *  chunk, fetched once any row is about to open, and the stop control. */
function useRunRowSlots(organizationId: string) {
  return useMemo<RunRowSlots>(
    () => ({
      expanded: (execution, now) => (
        <ExpandedRun
          execution={execution}
          now={now}
          organizationId={organizationId}
        />
      ),
      onPreload: preloadExpandedRun,
      stop: (execution) => (
        <StopExecution organizationId={organizationId} runId={execution.id} />
      ),
    }),
    [organizationId]
  )
}
