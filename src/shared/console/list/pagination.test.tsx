// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { useClientPagination, useResettingSetter } from "./pagination"

afterEach(cleanup)

test("keeps an empty list on a single disabled page", () => {
  const { result } = renderHook(() =>
    useClientPagination({
      hasFilters: false,
      isReady: true,
      itemLabel: { singular: "place", plural: "places" },
      items: [],
    })
  )

  expect(result.current.visibleRows).toEqual([])
  expect(result.current.footerLabel).toBeUndefined()
  expect(result.current.canGoNext).toBe(false)
  expect(result.current.pageIndex).toBe(0)
})

test("paginates fifty items through a short final page", () => {
  const items = Array.from({ length: 50 }, (_, index) => index + 1)
  const { result } = renderHook(() =>
    useClientPagination({
      hasFilters: false,
      isReady: true,
      itemLabel: { singular: "place", plural: "places" },
      items,
    })
  )

  expect(result.current.visibleRows).toEqual(items.slice(0, 12))

  for (let page = 0; page < 4; page += 1) {
    act(result.current.next)
  }

  expect(result.current.visibleRows).toEqual(items.slice(48))
  expect(result.current.footerLabel).toBe("Showing 49–50 of 50 places")
  expect(result.current.canGoNext).toBe(false)

  act(result.current.reset)
  expect(result.current.pageIndex).toBe(0)
})

test("updates a filter before resetting its pagination", () => {
  const calls: string[] = []
  const setValue = (value: string) => calls.push(`set:${value}`)
  const reset = () => calls.push("reset")
  const { result } = renderHook(() => useResettingSetter(setValue, reset))

  act(() => result.current("archived"))

  expect(calls).toEqual(["set:archived", "reset"])
})
