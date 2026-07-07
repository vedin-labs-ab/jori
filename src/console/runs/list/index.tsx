import { memo, useCallback, useDeferredValue, useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  ConsoleFilterField,
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsolePageLayout,
  ConsoleScrollableGrid,
  ConsoleSearch,
} from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { type ScopeFilter, scopeFilterOptions } from "../../shared/list/scope"
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
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
  const [query, setQuery] = useState("")
  const deferredApprovalFilter = useDeferredValue(approvalFilter)
  const deferredRunFilter = useDeferredValue(runFilter)
  const deferredScopeFilter = useDeferredValue(scopeFilter)
  const deferredQuery = useDeferredValue(query)
  const pagination = useExecutionPagination(
    tenantId,
    deferredRunFilter,
    deferredApprovalFilter,
    deferredScopeFilter,
    deferredQuery
  )
  const setApprovalFilterAndReset = useResetting(
    setApprovalFilter,
    pagination.reset
  )
  const setRunFilterAndReset = useResetting(setRunFilter, pagination.reset)
  const setScopeFilterAndReset = useResetting(setScopeFilter, pagination.reset)
  const setQueryAndReset = useResetting(setQuery, pagination.reset)

  return (
    <ConsolePageLayout>
      <ExecutionFilters
        approvalFilter={approvalFilter}
        query={query}
        runFilter={runFilter}
        scopeFilter={scopeFilter}
        setApprovalFilter={setApprovalFilterAndReset}
        setQuery={setQueryAndReset}
        setRunFilter={setRunFilterAndReset}
        setScopeFilter={setScopeFilterAndReset}
      />
      <ExecutionRows pagination={pagination} tenantId={tenantId} />
      <ConsoleListPager pagination={pagination} />
    </ConsolePageLayout>
  )
}

/** Wraps a setter so changing the filter also resets pagination. */
function useResetting<Value>(set: (value: Value) => void, reset: () => void) {
  return useCallback(
    (value: Value) => {
      set(value)
      reset()
    },
    [set, reset]
  )
}

const ExecutionFilters = memo(function ExecutionFilters({
  approvalFilter,
  query,
  runFilter,
  scopeFilter,
  setApprovalFilter,
  setQuery,
  setRunFilter,
  setScopeFilter,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  scopeFilter: ScopeFilter
  setApprovalFilter: (filter: ApprovalFilter) => void
  setQuery: (query: string) => void
  setRunFilter: (filter: RunFilter) => void
  setScopeFilter: (filter: ScopeFilter) => void
}) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search runs"
          onValueChange={setQuery}
          placeholder="Search runs..."
          value={query}
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={setRunFilter}
          options={runFilterOptions}
          value={runFilter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={setScopeFilter}
          options={scopeFilterOptions}
          value={scopeFilter}
        />
        <ConsoleFilterField label="Approval">
          <Select
            onValueChange={(value) =>
              setApprovalFilter(value as ApprovalFilter)
            }
            value={approvalFilter}
          >
            <SelectTrigger
              aria-label="Filter by approval state"
              className="w-fit"
            >
              <span className="font-medium">
                {approvalFilterLabels[approvalFilter]}
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
        </ConsoleFilterField>
      </ConsoleFilterGroup>
    </>
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
