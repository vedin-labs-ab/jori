import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useRef } from "react"
import { type TableRow } from "../types"

/** Every data row is exactly h-9 — the invariant that makes the window
 *  math exact: no measuring, no jumps, scrollbar length always true. */
const rowHeight = 36

/** Rows mounted beyond the viewport on each side, so fast scrolling and
 *  keyboard focus travel hit rendered rows instead of blank space. */
const overscanRows = 12

/** How close (in rows) the rendered window may get to the end of the
 *  loaded rows before the next page is requested — roughly a viewport,
 *  so scrolling at reading speed never reaches unloaded space. */
const fetchAheadRows = 40

/** Windowed rendering over the loaded rows, wired to incremental loading:
 *  only the visible rows plus overscan mount, the next page is requested
 *  before the window reaches the end of the loaded ones, and a freshly
 *  inserted row is scrolled into view so its spotlight can land. */
export function useRowWindow({
  freshRowId,
  isExhausted,
  isLoadingMore,
  loadMore,
  rows,
}: {
  freshRowId: TableRow["rowId"] | undefined
  isExhausted: boolean
  isLoadingMore: boolean
  loadMore: () => void
  rows: TableRow[]
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeight,
    getScrollElement: () => scrollRef.current,
    overscan: overscanRows,
  })
  const items = virtualizer.getVirtualItems()
  const lastMounted = items.at(-1)?.index ?? 0
  const shouldLoad =
    !isExhausted &&
    !isLoadingMore &&
    lastMounted >= rows.length - fetchAheadRows

  useEffect(() => {
    if (shouldLoad) {
      loadMore()
    }
  }, [loadMore, shouldLoad])

  const freshIndex =
    freshRowId === undefined
      ? -1
      : rows.findIndex((row) => row.rowId === freshRowId)

  useEffect(() => {
    if (freshIndex >= 0) {
      virtualizer.scrollToIndex(freshIndex)
    }
  }, [freshIndex, virtualizer])

  return { items, scrollRef, totalSize: virtualizer.getTotalSize() }
}
