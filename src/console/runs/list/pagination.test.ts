// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { usePaginatedQuery, useQuery } from "convex/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { makeExecution } from "@/shared/console/runs/fixtures"
import { type ExecutionItem, pageSize } from "@/shared/console/runs/types"
import { type ExecutionQuery, useExecutionPagination } from "./pagination"

vi.mock("convex/react", () => ({
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn(),
}))

const query: ExecutionQuery = {
  approvalFilter: "any",
  audienceFilter: "all",
  organizationId: "org_1",
  query: "",
  runFilter: "all",
}
const loadMore = vi.fn()

function rows(count: number) {
  return Array.from({ length: count }, (_, index) =>
    makeExecution({ id: `run_${index}` as ExecutionItem["id"] })
  )
}

function page(count: number, status = "Exhausted") {
  vi.mocked(usePaginatedQuery).mockReturnValue({
    results: rows(count),
    status,
    loadMore,
    isLoading: status === "LoadingFirstPage" || status === "LoadingMore",
  } as ReturnType<typeof usePaginatedQuery>)
}

beforeEach(() => {
  page(0, "LoadingFirstPage")
  vi.mocked(useQuery).mockReturnValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test("waits for both the first page and statistics before becoming ready", () => {
  const { result, rerender } = renderHook(() => useExecutionPagination(query))

  expect(result.current.isReady).toBe(false)
  expect(result.current.isLoadingFirstPage).toBe(true)
  expect(result.current.footerLabel).toBeUndefined()
  page(1)
  rerender()
  expect(result.current.isReady).toBe(false)
  vi.mocked(useQuery).mockReturnValue({ filteredCount: 1, totalCount: 1 })
  rerender()
  expect(result.current.isReady).toBe(true)
  expect(result.current.footerLabel).toBe("Showing 1–1 of 1 run")
})

test("navigates loaded pages, resets, and clamps when the total shrinks", () => {
  page(pageSize * 2 + 1)
  const { result, rerender } = renderHook(() => useExecutionPagination(query))

  expect(result.current.visibleRows).toHaveLength(pageSize)
  act(() => result.current.previous())
  expect(result.current.pageIndex).toBe(0)
  act(() => result.current.next())
  expect(result.current.pageIndex).toBe(1)
  expect(result.current.visibleRows[0].id).toBe(`run_${pageSize}`)
  act(() => result.current.next())
  expect(result.current.visibleRows).toHaveLength(1)
  expect(result.current.canGoNext).toBe(false)
  act(() => result.current.next())
  expect(result.current.pageIndex).toBe(2)
  expect(loadMore).not.toHaveBeenCalled()

  page(pageSize)
  vi.mocked(useQuery).mockReturnValue({
    filteredCount: pageSize,
    totalCount: pageSize,
  })
  rerender()
  expect(result.current.pageIndex).toBe(0)
  page(pageSize * 2)
  vi.mocked(useQuery).mockReturnValue(undefined)
  rerender()
  act(() => result.current.next())
  act(() => result.current.reset())
  expect(result.current.pageIndex).toBe(0)
})

test("advances after a requested page finishes loading and adds rows", () => {
  page(pageSize, "CanLoadMore")
  const { result, rerender } = renderHook(() => useExecutionPagination(query))

  act(() => result.current.next())
  expect(loadMore).toHaveBeenCalledExactlyOnceWith(pageSize)
  expect(result.current.pageIndex).toBe(0)
  page(pageSize + 1, "LoadingMore")
  rerender()
  expect(result.current.pageIndex).toBe(0)
  expect(result.current.isLoadingMore).toBe(true)
  page(pageSize + 1)
  rerender()
  expect(result.current.pageIndex).toBe(1)
  expect(result.current.visibleRows[0].id).toBe(`run_${pageSize}`)
  act(() => result.current.previous())
  rerender()
  expect(result.current.pageIndex).toBe(0)
})

test("stays on the current page if loading finds no more rows", () => {
  page(pageSize, "CanLoadMore")
  const { result, rerender } = renderHook(() => useExecutionPagination(query))

  act(() => result.current.next())
  page(pageSize)
  rerender()
  expect(result.current.pageIndex).toBe(0)
  expect(result.current.canGoNext).toBe(false)
})

test("normalizes filters and reports matching totals", () => {
  page(2)
  vi.mocked(useQuery).mockReturnValue({ filteredCount: 2, totalCount: 50 })
  const { result } = renderHook(() =>
    useExecutionPagination({ ...query, query: "  Billing  " })
  )

  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toMatchObject({
    query: "billing",
  })
  expect(result.current.hasFilters).toBe(true)
  expect(result.current.footerLabel).toBe(
    "Showing 1–2 of 2 matching runs (50 total)"
  )
})

test("restores a deep-linked page then allows manual paging", () => {
  page(pageSize * 2)
  const { result } = renderHook(() =>
    useExecutionPagination(query, { page: 1 })
  )

  expect(result.current.pageIndex).toBe(1)
  act(() => result.current.previous())
  expect(result.current.pageIndex).toBe(0)
})
