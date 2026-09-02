import { useSearch } from "@tanstack/react-router"
import {
  lazy,
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
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
} from "@/shared/console/layout"
import {
  type AudienceFilter,
  audienceFilterOptions,
} from "@/shared/console/list/audience"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useResettingSetter } from "@/shared/console/list/pagination"
import { ExecutionRow, type RunRowSlots } from "@/shared/console/runs/row"
import { displayNowForRun, runClockInterval } from "@/shared/console/runs/time"
import {
  type ApprovalFilter,
  approvalFilterLabels,
  approvalFilterOptions,
  type ExecutionItem,
  type RunFilter,
  runFilterOptions,
} from "@/shared/console/runs/types"
import { StopExecution } from "../row/stop"
import { EmptyExecutions } from "./empty"
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
    <ConsolePageLayout>
      <ExecutionFilters
        approvalFilter={approvalFilter}
        query={query}
        runFilter={runFilter}
        audienceFilter={audienceFilter}
        setApprovalFilter={setApprovalFilterAndReset}
        setQuery={setQueryAndReset}
        setRunFilter={setRunFilterAndReset}
        setAudienceFilter={setAudienceFilterAndReset}
      />
      <ExecutionRows
        focusRunId={focusRunId}
        pagination={pagination}
        showAudience={deferredAudienceFilter === "all"}
        organizationId={organizationId}
      />
      <ConsoleListPager pagination={pagination} />
    </ConsolePageLayout>
  )
}

const ExecutionFilters = memo(function ExecutionFilters({
  approvalFilter,
  query,
  runFilter,
  audienceFilter,
  setApprovalFilter,
  setQuery,
  setRunFilter,
  setAudienceFilter,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  audienceFilter: AudienceFilter
  setApprovalFilter: (filter: ApprovalFilter) => void
  setQuery: (query: string) => void
  setRunFilter: (filter: RunFilter) => void
  setAudienceFilter: (filter: AudienceFilter) => void
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
          onValueChange={setAudienceFilter}
          options={audienceFilterOptions}
          value={audienceFilter}
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

  if (pagination.isLoadingFirstPage) {
    return <ConsoleListLoading />
  }

  return (
    // auto-rows-max keeps row heights at their content size; without it the
    // overflow-hidden articles let the definite-height grid compress its
    // tracks to fit instead of overflowing into the scrollbar.
    <ConsoleScrollableGrid>
      {pagination.visibleRows.length === 0 ? (
        <EmptyExecutions hasFilters={pagination.hasFilters} />
      ) : null}
      {pagination.visibleRows.length > 0
        ? pagination.visibleRows.map((execution) => (
            <ExecutionRow
              {...slots}
              defaultOpen={execution.id === focusRunId}
              execution={execution}
              key={execution.id}
              now={displayNowForRun(execution, now)}
              showAudience={showAudience}
            />
          ))
        : null}
    </ConsoleScrollableGrid>
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

function useExecutionClock(runs: ExecutionItem[]) {
  const [now, setNow] = useState(() => Date.now())
  const intervalMs = runClockInterval(runs, now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}
