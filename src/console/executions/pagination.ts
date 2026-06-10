import { usePaginatedQuery, useQuery } from "convex/react"
import { type MutableRefObject, useEffect, useRef, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { type ExecutionItem, type FilterValue, pageSize } from "./types"

export function useExecutionPagination(
  tenantId: string,
  filter: FilterValue,
  query: string
) {
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const now = useNow()
  const normalizedQuery = query.trim().toLowerCase()
  const executions = usePaginatedQuery(
    api.executions.list.page,
    { filter, query: normalizedQuery, tenantId },
    { initialNumItems: pageSize }
  )
  const stats = useQuery(api.executions.list.stats, {
    filter,
    query: normalizedQuery,
    tenantId,
  })
  const rows = (executions.results ?? []) as ExecutionItem[]
  const filteredTotal = stats?.filteredCount ?? rows.length
  const totalCount = stats?.totalCount ?? filteredTotal
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize))
  const visibleRows = rows.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  )
  const canUseNextLoadedPage = rows.length > (pageIndex + 1) * pageSize
  const canLoadMore = executions.status === "CanLoadMore"
  const isLoadingMore = executions.status === "LoadingMore"

  usePageBounds(pageIndex, pageCount, setPageIndex)
  useAdvanceAfterLoad(advanceAfterLoad, rows.length, {
    isLoadingMore,
    pageIndex,
    setPageIndex,
  })

  const hasFilters = filter !== "all" || normalizedQuery !== ""
  const footerLabel = formatFooterLabel({
    filteredTotal,
    hasFilters,
    pageIndex,
    totalCount,
    visibleCount: visibleRows.length,
  })

  return {
    canGoNext: canUseNextLoadedPage || canLoadMore,
    footerLabel,
    hasFilters,
    isLoadingFirstPage: executions.status === "LoadingFirstPage",
    isLoadingMore,
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

export type ExecutionPagination = ReturnType<typeof useExecutionPagination>

function formatFooterLabel({
  filteredTotal,
  hasFilters,
  pageIndex,
  totalCount,
  visibleCount,
}: {
  filteredTotal: number
  hasFilters: boolean
  pageIndex: number
  totalCount: number
  visibleCount: number
}) {
  const rangeStart = visibleCount === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + visibleCount

  if (hasFilters) {
    return `Showing items ${rangeStart}-${rangeEnd} of ${filteredTotal} matching (${totalCount} total)`
  }

  return `Showing items ${rangeStart}-${rangeEnd} of ${totalCount} total`
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
  advanceAfterLoad: MutableRefObject<boolean>,
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
