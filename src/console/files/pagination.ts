import { usePaginatedQuery } from "convex/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { filePageSize } from "./types"

/** Server-paginated file pages behind the shared console pager: loaded rows
 *  are windowed locally, and Next fetches another page once the loaded rows
 *  run out. */
export function useFilePagination(organizationId: string) {
  const files = usePaginatedQuery(
    api.files.console.page,
    { organizationId },
    { initialNumItems: filePageSize }
  )
  const [pageIndex, setPageIndex] = useState(0)
  const advanceAfterLoad = useRef(false)
  const rows = files.results ?? []
  const canUseNextLoadedPage = rows.length > (pageIndex + 1) * filePageSize
  const canLoadMore = files.status === "CanLoadMore"
  const isLoadingMore = files.status === "LoadingMore"
  const visibleRows = rows.slice(
    pageIndex * filePageSize,
    pageIndex * filePageSize + filePageSize
  )
  const { loadMore } = files
  const next = useCallback(() => {
    if (canUseNextLoadedPage) {
      setPageIndex((current) => current + 1)
      return
    }

    if (canLoadMore) {
      advanceAfterLoad.current = true
      loadMore(filePageSize)
    }
  }, [canLoadMore, canUseNextLoadedPage, loadMore])
  const previous = useCallback(
    () => setPageIndex((current) => Math.max(0, current - 1)),
    []
  )

  useEffect(() => {
    if (advanceAfterLoad.current && !isLoadingMore && canUseNextLoadedPage) {
      advanceAfterLoad.current = false
      setPageIndex((current) => current + 1)
    }
  }, [canUseNextLoadedPage, isLoadingMore])

  usePageClamp(pageIndex, rows.length, setPageIndex)

  return {
    canGoNext: canUseNextLoadedPage || canLoadMore,
    footerLabel: footerLabel(pageIndex, visibleRows.length, {
      isExhausted: files.status === "Exhausted",
      loadedCount: rows.length,
    }),
    isLoading: files.status === "LoadingFirstPage",
    isLoadingMore,
    isReady: files.status !== "LoadingFirstPage",
    next,
    pageIndex,
    previous,
    visibleRows,
  }
}

/** Deleting the last row of the last page must land on the previous page. */
function usePageClamp(
  pageIndex: number,
  loadedCount: number,
  setPageIndex: (updater: (current: number) => number) => void
) {
  const pageCount = Math.max(1, Math.ceil(loadedCount / filePageSize))

  useEffect(() => {
    if (pageIndex >= pageCount) {
      setPageIndex(() => Math.max(0, pageCount - 1))
    }
  }, [pageCount, pageIndex, setPageIndex])
}

function footerLabel(
  pageIndex: number,
  visibleCount: number,
  loaded: { isExhausted: boolean; loadedCount: number }
) {
  if (visibleCount === 0) {
    return undefined
  }

  const rangeStart = pageIndex * filePageSize + 1
  const rangeEnd = pageIndex * filePageSize + visibleCount
  const total = `${loaded.loadedCount}${loaded.isExhausted ? "" : "+"}`
  const noun = loaded.loadedCount === 1 && loaded.isExhausted ? "file" : "files"

  return `Showing ${rangeStart}–${rangeEnd} of ${total} ${noun}`
}
