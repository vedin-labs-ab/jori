import { usePaginatedQuery, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type AudienceFilter } from "@/shared/console/list/audience"
import {
  type ApprovalFilter,
  type ExecutionItem,
  pageSize,
  type RunFilter,
} from "@/shared/console/runs/types"
import { api } from "../../../../convex/_generated/api"
import { type PageTarget, useSeekTarget } from "./seek"

/** What the page lists: the organization's runs under the Activity
 *  page's filters, or one job's alone. */
export type ExecutionQuery = {
  approvalFilter: ApprovalFilter
  audienceFilter: AudienceFilter
  jobId?: string
  organizationId: string
  query: string
  runFilter: RunFilter
}

export function useExecutionPagination(
  executionQuery: ExecutionQuery,
  target?: PageTarget
) {
  const { approvalFilter, audienceFilter, runFilter } = executionQuery
  const { normalizedQuery, rows, runs, stats } =
    useExecutionPageData(executionQuery)
  const filteredTotal = stats?.filteredCount ?? rows.length
  const totalCount = stats?.totalCount ?? filteredTotal
  const navigation = usePageNavigation(rows, runs, filteredTotal, target)

  const hasFilters =
    runFilter !== "all" ||
    approvalFilter !== "any" ||
    audienceFilter !== "all" ||
    normalizedQuery !== ""
  const footerLabel = formatFooterLabel({
    filteredTotal,
    hasFilters,
    pageIndex: navigation.pageIndex,
    totalCount,
    visibleCount: navigation.visibleRows.length,
  })

  return {
    ...navigation,
    footerLabel,
    hasFilters,
    isLoadingFirstPage: runs.status === "LoadingFirstPage",
    isReady: runs.status !== "LoadingFirstPage" && stats !== undefined,
  }
}

export type ExecutionPagination = ReturnType<typeof useExecutionPagination>

function usePageNavigation(
  rows: ExecutionItem[],
  runs: { status: string; loadMore: (numItems: number) => void },
  filteredTotal: number,
  target: PageTarget | undefined
) {
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize))
  const canLoadMore = runs.status === "CanLoadMore"
  const canUseNextLoadedPage = rows.length > (pageIndex + 1) * pageSize
  const isLoadingMore = runs.status === "LoadingMore"
  const pageStart = pageIndex * pageSize
  const visibleRows = rows.slice(pageStart, pageStart + pageSize)

  const next = useCallback(() => {
    if (canUseNextLoadedPage) {
      setPageIndex((current) => current + 1)
      return
    }

    if (canLoadMore) {
      advanceAfterLoad.current = true
      runs.loadMore(pageSize)
    }
  }, [canLoadMore, canUseNextLoadedPage, runs])
  const previous = useCallback(
    () => setPageIndex((current) => Math.max(0, current - 1)),
    []
  )
  const reset = useCallback(() => setPageIndex(0), [])

  useSeekTarget({ pageLoader: runs, rows, setPageIndex, target })
  useEffect(() => {
    if (pageIndex >= pageCount) {
      setPageIndex(Math.max(0, pageCount - 1))
    }
  }, [pageCount, pageIndex])
  useEffect(() => {
    if (
      advanceAfterLoad.current &&
      !isLoadingMore &&
      rows.length > (pageIndex + 1) * pageSize
    ) {
      advanceAfterLoad.current = false
      setPageIndex((current) => current + 1)
    }
  }, [rows.length, isLoadingMore, pageIndex])

  return {
    canGoNext: canUseNextLoadedPage || canLoadMore,
    isLoadingMore,
    next,
    pageIndex,
    previous,
    reset,
    visibleRows,
  }
}

function useExecutionPageData({
  approvalFilter,
  audienceFilter,
  jobId,
  organizationId,
  query,
  runFilter,
}: ExecutionQuery) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryArgs = useMemo(
    () => ({
      approvalFilter,
      audienceFilter,
      jobId: jobId as GenericId<"jobs"> | undefined,
      organizationId,
      query: normalizedQuery,
      runFilter,
    }),
    [
      approvalFilter,
      audienceFilter,
      jobId,
      normalizedQuery,
      organizationId,
      runFilter,
    ]
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
