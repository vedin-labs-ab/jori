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
import { type ScopeFilter } from "../../shared/list/scope"
import {
  type ApprovalFilter,
  type ExecutionItem,
  pageSize,
  type RunFilter,
} from "../types"
import { type PageTarget, useSeekTarget } from "./seek"

export function useExecutionPagination(
  organizationId: string,
  runFilter: RunFilter,
  approvalFilter: ApprovalFilter,
  scopeFilter: ScopeFilter,
  query: string,
  target?: PageTarget
) {
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const { normalizedQuery, rows, runs, stats } = useExecutionPageData({
    approvalFilter,
    query,
    runFilter,
    scopeFilter,
    organizationId,
  })
  const paging = derivePaging({ pageIndex, rows, stats, status: runs.status })
  const { canLoadMore, canUseNextLoadedPage, isLoadingMore, visibleRows } =
    paging
  const { next, previous, reset } = usePageNavigation({
    advanceAfterLoad,
    canLoadMore,
    canUseNextLoadedPage,
    pageLoader: runs,
    setPageIndex,
  })

  useSeekTarget({ pageLoader: runs, rows, setPageIndex, target })
  usePageBounds(pageIndex, paging.pageCount, setPageIndex)
  useAdvanceAfterLoad({
    advanceAfterLoad,
    filteredRowCount: rows.length,
    isLoadingMore,
    pageIndex,
    setPageIndex,
  })

  const hasFilters =
    runFilter !== "all" ||
    approvalFilter !== "any" ||
    scopeFilter !== "all" ||
    normalizedQuery !== ""
  const footerLabel = formatFooterLabel({
    filteredTotal: paging.filteredTotal,
    hasFilters,
    pageIndex,
    totalCount: paging.totalCount,
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

function derivePaging({
  pageIndex,
  rows,
  stats,
  status,
}: {
  pageIndex: number
  rows: ExecutionItem[]
  stats: { filteredCount: number; totalCount: number } | undefined
  status: string
}) {
  const filteredTotal = stats?.filteredCount ?? rows.length

  return {
    canLoadMore: status === "CanLoadMore",
    canUseNextLoadedPage: rows.length > (pageIndex + 1) * pageSize,
    filteredTotal,
    isLoadingMore: status === "LoadingMore",
    pageCount: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    totalCount: stats?.totalCount ?? filteredTotal,
    visibleRows: pageRows(rows, pageIndex),
  }
}

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
  scopeFilter,
  organizationId,
}: {
  approvalFilter: ApprovalFilter
  query: string
  runFilter: RunFilter
  scopeFilter: ScopeFilter
  organizationId: string
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryArgs = useMemo(
    () => ({
      approvalFilter,
      query: normalizedQuery,
      runFilter,
      scopeFilter,
      organizationId,
    }),
    [approvalFilter, normalizedQuery, runFilter, scopeFilter, organizationId]
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
  if (visibleCount === 0) {
    return undefined
  }

  const rangeStart = pageIndex * pageSize + 1
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
