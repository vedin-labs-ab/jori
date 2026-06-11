import { Loader2, Search } from "lucide-react"
import { useState } from "react"
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
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { EmptyExecutions, ExecutionSkeletonList } from "./empty"
import { type ExecutionPagination, useExecutionPagination } from "./pagination"
import { ExecutionRow } from "./row"
import {
  type ApprovalFilter,
  approvalFilterOptions,
  type ExecutionFilter,
  executionFilterOptions,
} from "./types"

export function ExecutionsList({ tenantId }: { tenantId: string }) {
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("any")
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>("all")
  const [query, setQuery] = useState("")
  const pagination = useExecutionPagination(
    tenantId,
    executionFilter,
    approvalFilter,
    query
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <ExecutionFilters
          approvalFilter={approvalFilter}
          executionFilter={executionFilter}
          query={query}
          setApprovalFilter={(value) => {
            setApprovalFilter(value)
            pagination.reset()
          }}
          setExecutionFilter={(value) => {
            setExecutionFilter(value)
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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none">
        <Select
          onValueChange={(value) => setApprovalFilter(value as ApprovalFilter)}
          value={approvalFilter}
        >
          <SelectTrigger
            aria-label="Filter by approval state"
            className="h-8 w-full sm:w-fit"
          >
            <span>Approval:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
            aria-label="Search executions"
            className="h-8 pr-2 pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search executions..."
            value={query}
          />
        </div>
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
