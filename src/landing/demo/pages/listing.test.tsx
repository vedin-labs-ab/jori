// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { useMaterialListing } from "./listing"

afterEach(cleanup)

test("search resets the page and preserves header sorting over matching names", () => {
  const rows = Array.from({ length: 30 }, (_, rank) => ({
    name: `${rank % 2 === 0 ? "Match" : "Other"} ${rank}`,
    rank,
  }))
  const { result } = renderHook(() =>
    useMaterialListing({
      config: { facets: {}, sorts: { rank: (row) => row.rank } },
      identify: (row) => row.name,
      noun: { singular: "file", plural: "files" },
      rows,
    })
  )
  act(() => result.current.controls.toggleSort("rank"))
  act(() => result.current.controls.toggleSort("rank"))
  act(result.current.pagination.next)
  act(() => result.current.setQuery("  MATCH  "))

  expect(result.current.pagination.pageIndex).toBe(0)
  expect(result.current.pagination.visibleRows.map((row) => row.rank)).toEqual([
    28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6,
  ])
  expect(result.current.pagination.footerLabel).toBe(
    "Showing 1–12 of 15 matching files"
  )
})
