import { memo, useCallback, useDeferredValue, useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  ConsoleFilterToggle,
  ConsolePageLayout,
  ConsoleScrollableGrid,
  ConsoleToolbar,
  ConsoleToolbarActions,
  ConsoleToolbarSearch,
} from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { ExecutionRow } from "../row"
import { displayNowForRun, runClockInterval } from "../time"
import {
  type ApprovalFilter,
  approvalFilterLabels,
  approvalFilterOptions,
  type ExecutionItem,
  type RunFilter,
  runFilterOptions,
} from "../types"
import { EmptyExecutions, ExecutionSkeletonList } from "./empty"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"

export function RunsList({ tenantId }: { tenantId: string }) {
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("any")
  const [runFilter, setRunFilter] = useState<RunFilter>("all")
  const [query, setQuery] = useState("")
  const deferredApprovalFilter = useDeferredValue(approvalFilter)
  const deferredRunFilter = useDeferredValue(runFilter)
  const deferredQuery = useDeferredValue(query)
  const pagination = useExecutionPagination(
    tenantId,
    deferredRunFilter,
    deferredApprovalFilter,
    deferredQuery
  )
  const setApprovalFilterAndReset = useCallback(
    (value: ApprovalFilter) => {
      setApprovalFilter(value)
      pagination.reset()
    },
    [pagination.reset]
  )
  const setRunFilterAndReset = useCallback(
    (value: RunFilter) => {
      setRunFilter(value)
      pagination.reset()
    },
    [pagination.reset]
  )
  const setQueryAndReset = useCallback(
    (value: string) => {
      setQuery(value)
      pagination.reset()
    },
    [pagination.reset]
  )

  return (
    <ConsolePageLayout>
      <ExecutionFilters
        approvalFilter={approvalFilter}
        query={query}
        runFilter={runFilter}
        setApprovalFilter={setApprovalFilterAndReset}
        setQuery={setQueryAndReset}
        setRunFilter={setRunFilterAndReset}
      />
      <ExecutionRows pagination={pagination} tenantId={tenantId} />
      <ConsoleListPager pagination={pagination} />
    </ConsolePageLayout>
  )
}

const ExecutionFilters = memo(function ExecutionFilters({
  approvalFilter,
  query,
  runFilter,
  setApprovalFilter,
  setQuery,
  setRunFilter,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  setApprovalFilter: (filter: ApprovalFilter) => void
  setQuery: (query: string) => void
  setRunFilter: (filter: RunFilter) => void
}) {
  return (
    <ConsoleToolbar>
      <ConsoleFilterToggle
        onValueChange={setRunFilter}
        options={runFilterOptions}
        value={runFilter}
      />
      <ConsoleToolbarActions>
        <Select
          onValueChange={(value) => setApprovalFilter(value as ApprovalFilter)}
          value={approvalFilter}
        >
          <SelectTrigger
            aria-label="Filter by approval state"
            className="w-full sm:w-fit"
          >
            <span className="min-w-0 flex-1 truncate text-left sm:flex-none">
              Approval:{" "}
              <span className="font-medium">
                {approvalFilterLabels[approvalFilter]}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent align="start" position="popper">
            {approvalFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ConsoleToolbarSearch
          label="Search runs"
          onValueChange={setQuery}
          placeholder="Search runs..."
          value={query}
        />
      </ConsoleToolbarActions>
    </ConsoleToolbar>
  )
})

function ExecutionRows({
  pagination,
  tenantId,
}: {
  pagination: ExecutionPagination
  tenantId: string
}) {
  const now = useExecutionClock(pagination.visibleRows)

  return (
    // auto-rows-max keeps row heights at their content size; without it the
    // overflow-hidden articles let the definite-height grid compress its
    // tracks to fit instead of overflowing into the scrollbar.
    <ConsoleScrollableGrid>
      {pagination.isLoadingFirstPage ? <ExecutionSkeletonList /> : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length === 0 ? (
        <EmptyExecutions hasFilters={pagination.hasFilters} />
      ) : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length > 0
        ? pagination.visibleRows.map((execution) => (
            <ExecutionRow
              execution={execution}
              key={execution.id}
              now={displayNowForRun(execution, now)}
              tenantId={tenantId}
            />
          ))
        : null}
    </ConsoleScrollableGrid>
  )
}

function useExecutionClock(runs: ExecutionItem[]) {
  const [now, setNow] = useState(() => Date.now())
  const intervalMs = runClockInterval(runs, now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}
