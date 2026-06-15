import { Loader2, Search } from "lucide-react"
import { memo, useCallback, useDeferredValue, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import {
  ConsolePageLayout,
  ConsoleScrollableGrid,
  ConsoleToolbar,
  ConsoleToolbarActions,
} from "../../layout"
import { ExecutionRow } from "../row"
import { displayNowForExecution, executionClockInterval } from "../time"
import {
  type ApprovalFilter,
  approvalFilterLabels,
  approvalFilterOptions,
  type ExecutionFilter,
  type ExecutionItem,
  executionFilterOptions,
} from "../types"
import { EmptyExecutions, ExecutionSkeletonList } from "./empty"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"

export function RunsList({ tenantId }: { tenantId: string }) {
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("any")
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>("all")
  const [query, setQuery] = useState("")
  const deferredApprovalFilter = useDeferredValue(approvalFilter)
  const deferredExecutionFilter = useDeferredValue(executionFilter)
  const deferredQuery = useDeferredValue(query)
  const pagination = useExecutionPagination(
    tenantId,
    deferredExecutionFilter,
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
  const setExecutionFilterAndReset = useCallback(
    (value: ExecutionFilter) => {
      setExecutionFilter(value)
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
        executionFilter={executionFilter}
        query={query}
        setApprovalFilter={setApprovalFilterAndReset}
        setExecutionFilter={setExecutionFilterAndReset}
        setQuery={setQueryAndReset}
      />
      <ExecutionRows pagination={pagination} tenantId={tenantId} />
      <ExecutionPager pagination={pagination} />
    </ConsolePageLayout>
  )
}

const ExecutionFilters = memo(function ExecutionFilters({
  approvalFilter,
  executionFilter,
  query,
  setApprovalFilter,
  setExecutionFilter,
  setQuery,
}: {
  approvalFilter: ApprovalFilter
  executionFilter: ExecutionFilter
  query: string
  setApprovalFilter: (filter: ApprovalFilter) => void
  setExecutionFilter: (filter: ExecutionFilter) => void
  setQuery: (query: string) => void
}) {
  return (
    <ConsoleToolbar>
      <ToggleGroup
        className="flex-wrap justify-start"
        onValueChange={(value) => {
          if (value !== "") {
            setExecutionFilter(value as ExecutionFilter)
          }
        }}
        type="single"
        value={executionFilter}
        variant="outline"
      >
        {executionFilterOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
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
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search runs"
            className="pr-2 pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search runs..."
            value={query}
          />
        </div>
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
              now={displayNowForExecution(execution, now)}
              tenantId={tenantId}
            />
          ))
        : null}
    </ConsoleScrollableGrid>
  )
}

function useExecutionClock(executions: ExecutionItem[]) {
  const [now, setNow] = useState(() => Date.now())
  const intervalMs = executionClockInterval(executions, now)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}

function ExecutionPager({ pagination }: { pagination: ExecutionPagination }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">{pagination.footerLabel}</p>
      <Pagination className="mx-0 w-fit justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={pagination.pageIndex === 0}
              className={cn(
                pagination.pageIndex === 0 &&
                  "pointer-events-none opacity-50 shadow-none"
              )}
              href="#"
              onClick={(event) => {
                event.preventDefault()
                pagination.previous()
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <Button
              disabled={!pagination.canGoNext || pagination.isLoadingMore}
              onClick={pagination.next}
              type="button"
              variant="outline"
            >
              {pagination.isLoadingMore ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
