import { usePaginatedQuery } from "convex/react"
import { Loader2, Search, SlidersHorizontal } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import { EmptyExecutions, ExecutionSkeletonList } from "./empty"
import { matchesFilter } from "./format"
import { ExecutionRow } from "./row"
import {
  type ExecutionItem,
  type FilterValue,
  filterOptions,
  pageSize,
} from "./types"

export function ExecutionsList({ tenantId }: { tenantId: string }) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [query, setQuery] = useState("")
  const pagination = useExecutionPagination(tenantId, filter, query)

  return (
    <section className="grid gap-4">
      <ExecutionsHeader />
      <div className="rounded-lg border bg-card">
        <ExecutionFilters
          filter={filter}
          query={query}
          setFilter={(value) => {
            setFilter(value)
            pagination.reset()
          }}
          setQuery={(value) => {
            setQuery(value)
            pagination.reset()
          }}
        />
        <ExecutionRows pagination={pagination} />
        <ExecutionPager pagination={pagination} />
      </div>
    </section>
  )
}

function ExecutionsHeader() {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <h1 className="font-medium text-2xl tracking-normal">Executions</h1>
        <Badge
          variant="outline"
          className="border-emerald-700/20 bg-emerald-700/10 text-emerald-800"
        >
          Live
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Agent runs for this workspace.
      </p>
    </div>
  )
}

function ExecutionFilters({
  filter,
  query,
  setFilter,
  setQuery,
}: {
  filter: FilterValue
  query: string
  setFilter: (filter: FilterValue) => void
  setQuery: (query: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            onClick={() => setFilter(option.value)}
            type="button"
            variant={filter === option.value ? "default" : "secondary"}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 md:w-72">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search executions"
            className="h-8 pr-2 pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search executions..."
            value={query}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="outline" size="icon-lg">
              <SlidersHorizontal />
              <span className="sr-only">Filters are applied live</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Filters apply to loaded executions</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function ExecutionRows({
  pagination,
}: {
  pagination: ReturnType<typeof useExecutionPagination>
}) {
  return (
    <div className="grid gap-2 p-3">
      {pagination.isLoadingFirstPage ? <ExecutionSkeletonList /> : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length === 0 ? (
        <EmptyExecutions hasFilters={pagination.hasFilters} />
      ) : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length > 0
        ? pagination.visibleRows.map((execution, index) => (
            <ExecutionRow
              defaultOpen={pagination.pageIndex === 0 && index === 0}
              execution={execution}
              key={execution.id}
              now={pagination.now}
            />
          ))
        : null}
    </div>
  )
}

function ExecutionPager({
  pagination,
}: {
  pagination: ReturnType<typeof useExecutionPagination>
}) {
  return (
    <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-xs">
        Showing {pagination.firstVisibleNumber}-{pagination.lastVisibleNumber}{" "}
        of {pagination.filteredRows.length} loaded
      </p>
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

function useExecutionPagination(
  tenantId: string,
  filter: FilterValue,
  query: string
) {
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const now = useNow()
  const executions = usePaginatedQuery(
    api.executions.list.page,
    { tenantId },
    { initialNumItems: pageSize }
  )
  const rows = (executions.results ?? []) as ExecutionItem[]
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRows = useMemo(
    () => filterRows(rows, filter, normalizedQuery),
    [filter, normalizedQuery, rows]
  )
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  )
  const canUseNextLoadedPage = pageIndex + 1 < pageCount
  const canLoadMore = executions.status === "CanLoadMore"
  const isLoadingMore = executions.status === "LoadingMore"

  usePageBounds(pageIndex, pageCount, setPageIndex)
  useAdvanceAfterLoad(advanceAfterLoad, filteredRows.length, {
    isLoadingMore,
    pageIndex,
    setPageIndex,
  })

  return {
    canGoNext: canUseNextLoadedPage || canLoadMore,
    filteredRows,
    firstVisibleNumber: visibleRows.length === 0 ? 0 : pageIndex * pageSize + 1,
    hasFilters: filter !== "all" || normalizedQuery !== "",
    isLoadingFirstPage: executions.status === "LoadingFirstPage",
    isLoadingMore,
    lastVisibleNumber: pageIndex * pageSize + visibleRows.length,
    next: () => {
      if (canUseNextLoadedPage) {
        setPageIndex((current) => current + 1)
      } else if (canLoadMore) {
        advanceAfterLoad.current = true
        executions.loadMore(pageSize)
      }
    },
    now,
    pageIndex,
    previous: () => setPageIndex((current) => Math.max(0, current - 1)),
    reset: () => setPageIndex(0),
    visibleRows,
  }
}

function filterRows(
  rows: ExecutionItem[],
  filter: FilterValue,
  normalizedQuery: string
) {
  return rows.filter((row) => {
    if (!matchesFilter(row, filter)) {
      return false
    }

    return (
      normalizedQuery === "" || row.searchableText.includes(normalizedQuery)
    )
  })
}

function usePageBounds(
  pageIndex: number,
  pageCount: number,
  setPageIndex: (updater: (current: number) => number) => void
) {
  useEffect(() => {
    if (pageIndex >= pageCount) {
      setPageIndex(() => Math.max(0, pageCount - 1))
    }
  }, [pageCount, pageIndex, setPageIndex])
}

function useAdvanceAfterLoad(
  advanceAfterLoad: React.MutableRefObject<boolean>,
  filteredRowCount: number,
  input: {
    isLoadingMore: boolean
    pageIndex: number
    setPageIndex: (updater: (current: number) => number) => void
  }
) {
  useEffect(() => {
    if (
      advanceAfterLoad.current &&
      !input.isLoadingMore &&
      filteredRowCount > (input.pageIndex + 1) * pageSize
    ) {
      advanceAfterLoad.current = false
      input.setPageIndex((current) => current + 1)
    }
  }, [advanceAfterLoad, filteredRowCount, input])
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(interval)
  }, [])

  return now
}
