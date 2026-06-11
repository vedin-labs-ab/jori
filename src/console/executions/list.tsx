import { Loader2, Search, SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EmptyExecutions, ExecutionSkeletonList } from "./empty"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"
import { ExecutionRow } from "./row"
import { type FilterValue, filterOptions } from "./types"

export function ExecutionsList({ tenantId }: { tenantId: string }) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [query, setQuery] = useState("")
  const pagination = useExecutionPagination(tenantId, filter, query)

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
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
        <ExecutionRows pagination={pagination} tenantId={tenantId} />
        <ExecutionPager pagination={pagination} />
      </div>
    </section>
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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <ToggleGroup
        className="flex-wrap justify-start"
        onValueChange={(value) => {
          if (value !== "") {
            setFilter(value as FilterValue)
          }
        }}
        type="single"
        value={filter}
        variant="outline"
      >
        {filterOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
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
          <TooltipContent>Filters apply to all executions</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function ExecutionRows({
  pagination,
  tenantId,
}: {
  pagination: ExecutionPagination
  tenantId: string
}) {
  return (
    // auto-rows-max keeps row heights at their content size; without it the
    // overflow-hidden articles let the definite-height grid compress its
    // tracks to fit instead of overflowing into the scrollbar.
    <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-2 overflow-y-auto">
      {pagination.isLoadingFirstPage ? <ExecutionSkeletonList /> : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length === 0 ? (
        <EmptyExecutions hasFilters={pagination.hasFilters} />
      ) : null}
      {!pagination.isLoadingFirstPage && pagination.visibleRows.length > 0
        ? pagination.visibleRows.map((execution) => (
            <ExecutionRow
              execution={execution}
              key={execution.id}
              now={pagination.now}
              tenantId={tenantId}
            />
          ))
        : null}
    </div>
  )
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
