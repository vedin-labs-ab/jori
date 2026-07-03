import { usePaginatedQuery, useQuery } from "convex/react"
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { api } from "../../../../convex/_generated/api"
import {
  type ApprovalFilter,
  type ExecutionItem,
  pageSize,
  type RunFilter,
} from "../types"

export function useExecutionPagination(
  tenantId: string,
  runFilter: RunFilter,
  approvalFilter: ApprovalFilter,
  query: string
) {
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const { normalizedQuery, rows, runs, stats } = useExecutionPageData({
    approvalFilter,
    query,
    runFilter,
    tenantId,
  })
  const filteredTotal = stats?.filteredCount ?? rows.length
  const totalCount = stats?.totalCount ?? filteredTotal
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize))
  const visibleRows = pageRows(rows, pageIndex)
  const canUseNextLoadedPage = rows.length > (pageIndex + 1) * pageSize
  const canLoadMore = runs.status === "CanLoadMore"
  const isLoadingMore = runs.status === "LoadingMore"
  const { next, previous, reset } = usePageNavigation({
    advanceAfterLoad,
    canLoadMore,
    canUseNextLoadedPage,
    pageLoader: runs,
    setPageIndex,
  })

  usePageBounds(pageIndex, pageCount, setPageIndex)
  useAdvanceAfterLoad({
    advanceAfterLoad,
    filteredRowCount: rows.length,
    isLoadingMore,
    pageIndex,
    setPageIndex,
  })

  const hasFilters = hasActiveFilters({
    approvalFilter,
    normalizedQuery,
    runFilter,
  })
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
    isLoadingFirstPage: runs.status === "LoadingFirstPage",
    isLoadingMore,
    isReady: runs.status !== "LoadingFirstPage" && stats !== undefined,
    next,
    pageIndex,
    previous,
    reset,
    visibleRows,
  }
}

export type ExecutionPagination = ReturnType<typeof useExecutionPagination>

function usePageNavigation({
  advanceAfterLoad,
  canLoadMore,
  canUseNextLoadedPage,
  pageLoader,
  setPageIndex,
}: {
  advanceAfterLoad: MutableRefObject<boolean>
  canLoadMore: boolean
  canUseNextLoadedPage: boolean
  pageLoader: { loadMore: (numItems: number) => void }
  setPageIndex: (updater: (current: number) => number) => void
}) {
  const next = useCallback(() => {
    if (canUseNextLoadedPage) {
      setPageIndex((current) => current + 1)
      return
    }

    if (canLoadMore) {
      advanceAfterLoad.current = true
      pageLoader.loadMore(pageSize)
    }
  }, [
    advanceAfterLoad,
    canLoadMore,
    canUseNextLoadedPage,
    pageLoader,
    setPageIndex,
  ])
  const previous = useCallback(
    () => setPageIndex((current) => Math.max(0, current - 1)),
    [setPageIndex]
  )
  const reset = useCallback(() => setPageIndex(() => 0), [setPageIndex])

  return { next, previous, reset }
}

function useExecutionPageData({
  approvalFilter,
  query,
  runFilter,
  tenantId,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  tenantId: string
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryArgs = useMemo(
    () => ({
      approvalFilter,
      query: normalizedQuery,
      runFilter,
      tenantId,
    }),
    [approvalFilter, normalizedQuery, runFilter, tenantId]
  )
  const runs = usePaginatedQuery(api.runs.console.page, queryArgs, {
    initialNumItems: pageSize,
  })
  const stats = useQuery(api.runs.console.stats, queryArgs)

  return {
    normalizedQuery,
    rows: runs.results ?? [],
    runs,
    stats,
  }
}

function pageRows(rows: ExecutionItem[], pageIndex: number) {
  return rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
}

function hasActiveFilters({
  approvalFilter,
  normalizedQuery,
  runFilter,
}: {
  approvalFilter: ApprovalFilter
  normalizedQuery: string
  runFilter: RunFilter
}) {
  return (
    runFilter !== "all" || approvalFilter !== "any" || normalizedQuery !== ""
  )
}

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
    return `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} matching ${pluralRuns(filteredTotal)} (${totalCount} total)`
  }

  return `Showing ${rangeStart}–${rangeEnd} of ${totalCount} ${pluralRuns(totalCount)}`
}

function pluralRuns(count: number) {
  return count === 1 ? "run" : "runs"
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

function useAdvanceAfterLoad({
  advanceAfterLoad,
  filteredRowCount,
  isLoadingMore,
  pageIndex,
  setPageIndex,
}: {
  advanceAfterLoad: MutableRefObject<boolean>
  filteredRowCount: number
  isLoadingMore: boolean
  pageIndex: number
  setPageIndex: (updater: (current: number) => number) => void
}) {
  useEffect(() => {
    if (
      advanceAfterLoad.current &&
      !isLoadingMore &&
      filteredRowCount > (pageIndex + 1) * pageSize
    ) {
      advanceAfterLoad.current = false
      setPageIndex((current) => current + 1)
    }
  }, [
    advanceAfterLoad,
    filteredRowCount,
    isLoadingMore,
    pageIndex,
    setPageIndex,
  ])
}
