import { useCallback, useEffect, useMemo, useState } from "react"

const consoleGridPageSize = 12

/** Keeps filter changes and pagination resets in one stable callback. */
export function useResettingSetter<Value>(
  setValue: (value: Value) => void,
  reset: () => void
) {
  return useCallback(
    (value: Value) => {
      setValue(value)
      reset()
    },
    [reset, setValue]
  )
}

export function useClientPagination<T>({
  hasFilters,
  isReady,
  itemLabel,
  items,
  pageSize = consoleGridPageSize,
  totalCount = items.length,
}: {
  hasFilters: boolean
  isReady: boolean
  itemLabel: { singular: string; plural: string }
  items: T[]
  pageSize?: number
  totalCount?: number
}) {
  const [pageIndex, setPageIndex] = useState(0)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (pageIndex >= pageCount) {
      setPageIndex(Math.max(0, pageCount - 1))
    }
  }, [pageCount, pageIndex])

  const visibleRows = useMemo(
    () => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [items, pageIndex, pageSize]
  )
  const previous = useCallback(
    () => setPageIndex((current) => Math.max(0, current - 1)),
    []
  )
  const next = useCallback(() => {
    setPageIndex((current) => Math.min(pageCount - 1, current + 1))
  }, [pageCount])
  const reset = useCallback(() => setPageIndex(0), [])

  return {
    canGoNext: pageIndex < pageCount - 1,
    footerLabel: formatFooterLabel({
      filteredTotal: items.length,
      hasFilters,
      itemLabel,
      pageIndex,
      pageSize,
      totalCount,
      visibleCount: visibleRows.length,
    }),
    isReady,
    next,
    pageIndex,
    previous,
    reset,
    visibleRows,
  }
}

function formatFooterLabel({
  filteredTotal,
  hasFilters,
  itemLabel,
  pageIndex,
  pageSize,
  totalCount,
  visibleCount,
}: {
  filteredTotal: number
  hasFilters: boolean
  itemLabel: { singular: string; plural: string }
  pageIndex: number
  pageSize: number
  totalCount: number
  visibleCount: number
}) {
  if (visibleCount === 0) {
    return undefined
  }

  const rangeStart = pageIndex * pageSize + 1
  const rangeEnd = pageIndex * pageSize + visibleCount
  const filteredLabel = pluralize(filteredTotal, itemLabel)
  const totalLabel = pluralize(totalCount, itemLabel)

  if (hasFilters) {
    if (totalCount === filteredTotal) {
      return `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} matching ${filteredLabel}`
    }

    return `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} matching ${filteredLabel} (${totalCount} total)`
  }

  return `Showing ${rangeStart}–${rangeEnd} of ${totalCount} ${totalLabel}`
}

function pluralize(
  count: number,
  itemLabel: { singular: string; plural: string }
) {
  return count === 1 ? itemLabel.singular : itemLabel.plural
}
