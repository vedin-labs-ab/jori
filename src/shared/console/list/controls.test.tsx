// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import {
  applyControls,
  facetEntries,
  type ListConfig,
  nextSort,
  resettingControls,
  toggledFacet,
  useListControls,
  useListState,
} from "./controls"

afterEach(cleanup)

type Item = {
  folder: string
  name: string
  size: number
  status: "active" | "archived"
}

const config: ListConfig<Item> = {
  facets: {
    folder: {
      label: "Folder",
      options: [
        { label: "Drafts", value: "drafts" },
        { label: "Sent", value: "sent" },
      ],
      resolve: (item) => item.folder,
    },
    status: {
      defaults: ["active"],
      label: "Status",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
      ],
      resolve: (item) => item.status,
    },
  },
  sorts: {
    name: (item) => item.name,
    size: (item) => item.size,
  },
}

function item(name: string, overrides: Partial<Item> = {}): Item {
  return { folder: "drafts", name, size: 0, status: "active", ...overrides }
}

const allSelected = { folder: undefined, status: undefined }

test("preserves input order when no sort is active", () => {
  const rows = [item("beta"), item("alpha"), item("charlie")]

  const result = applyControls(rows, config, {
    selections: allSelected,
    sort: undefined,
  })

  expect(result.map((row) => row.name)).toEqual(["beta", "alpha", "charlie"])
})

test("sorts strings both ways with localeCompare", () => {
  const rows = [item("Émile"), item("beta"), item("alpha")]

  const ascending = applyControls(rows, config, {
    selections: allSelected,
    sort: { direction: "asc", key: "name" },
  })
  const descending = applyControls(rows, config, {
    selections: allSelected,
    sort: { direction: "desc", key: "name" },
  })

  expect(ascending.map((row) => row.name)).toEqual(["alpha", "beta", "Émile"])
  expect(descending.map((row) => row.name)).toEqual(["Émile", "beta", "alpha"])
})

test("sorts numbers numerically and keeps equal rows stable", () => {
  const rows = [
    item("second", { size: 10 }),
    item("first", { size: 2 }),
    item("third", { size: 10 }),
  ]

  const result = applyControls(rows, config, {
    selections: allSelected,
    sort: { direction: "asc", key: "size" },
  })

  expect(result.map((row) => row.name)).toEqual(["first", "second", "third"])
})

test("an unknown sort key leaves the input order alone", () => {
  const rows = [item("beta"), item("alpha")]

  const result = applyControls(rows, config, {
    selections: allSelected,
    sort: { direction: "asc", key: "missing" },
  })

  expect(result.map((row) => row.name)).toEqual(["beta", "alpha"])
})

test("facet selections narrow rows and combine with sorting", () => {
  const rows = [
    item("archived-sent", { folder: "sent", status: "archived" }),
    item("active-sent", { folder: "sent" }),
    item("active-draft"),
    item("another-sent", { folder: "sent" }),
  ]

  const result = applyControls(rows, config, {
    selections: { folder: ["sent"], status: ["active"] },
    sort: { direction: "asc", key: "name" },
  })

  expect(result.map((row) => row.name)).toEqual(["active-sent", "another-sent"])
})

test("an empty facet selection matches nothing", () => {
  const result = applyControls([item("only")], config, {
    selections: { folder: [], status: undefined },
    sort: undefined,
  })

  expect(result).toEqual([])
})

test("the sort cycles asc, desc, off, and restarts on a new key", () => {
  const ascending = nextSort(undefined, "name")
  const descending = nextSort(ascending, "name")

  expect(ascending).toEqual({ direction: "asc", key: "name" })
  expect(descending).toEqual({ direction: "desc", key: "name" })
  expect(nextSort(descending, "name")).toBeUndefined()
  expect(nextSort(descending, "size")).toEqual({
    direction: "asc",
    key: "size",
  })
})

test("checking the last unchecked option resets the facet to all", () => {
  const options = config.facets.status?.options ?? []

  expect(toggledFacet(["active"], "archived", options)).toBeUndefined()
  expect(toggledFacet(["active"], "active", options)).toEqual([])
  expect(toggledFacet([], "archived", options)).toEqual(["archived"])
})

test("facet defaults keep the archived rows hidden but inactive", () => {
  const { result } = renderHook(() => useListControls(config))

  expect(result.current.getFacet("status")).toEqual(["active"])
  expect(result.current.hasActiveControls).toBe(false)
  expect(
    result.current.apply([item("active"), item("gone", { status: "archived" })])
  ).toEqual([item("active")])
})

test("moving a facet off its default marks the controls active", () => {
  const { result } = renderHook(() => useListControls(config))

  act(() => result.current.setFacet("status", undefined))

  expect(result.current.isFacetActive("status")).toBe(true)
  expect(result.current.hasActiveControls).toBe(true)

  act(() => result.current.setFacet("status", ["active"]))

  expect(result.current.hasActiveControls).toBe(false)
})

test("toggling a sort marks the controls active until it cycles off", () => {
  const { result } = renderHook(() => useListControls(config))

  act(() => result.current.toggleSort("name"))
  expect(result.current.sort).toEqual({ direction: "asc", key: "name" })
  expect(result.current.hasActiveControls).toBe(true)

  act(() => result.current.toggleSort("name"))
  act(() => result.current.toggleSort("name"))
  expect(result.current.sort).toBeUndefined()
  expect(result.current.hasActiveControls).toBe(false)
})

test("resetting controls run the reset after every change", () => {
  const calls: string[] = []
  const { result } = renderHook(() => useListControls(config))
  const wrapped = resettingControls(result.current, () => calls.push("reset"))

  act(() => wrapped.toggleSort("name"))
  act(() => wrapped.setFacet("folder", ["sent"]))

  expect(calls).toEqual(["reset", "reset"])
})

test("facet entries pick menu content off the config in order", () => {
  expect(facetEntries(config, ["status", "missing", "folder"])).toEqual([
    { key: "status", label: "Status", options: config.facets.status?.options },
    { key: "folder", label: "Folder", options: config.facets.folder?.options },
  ])
})

const stateRows = Array.from({ length: 30 }, (_, index) => index + 1)
const stateConfig: ListConfig<number> = {
  facets: {
    parity: {
      label: "Parity",
      options: [
        { label: "Even", value: "0" },
        { label: "Odd", value: "1" },
      ],
      resolve: (row) => String(row % 2),
    },
  },
  sorts: { rank: (row) => row },
}
const stateOptions = {
  config: stateConfig,
  identify: String,
  isReady: true,
  noun: { singular: "row", plural: "rows" },
  rows: stateRows,
}

test("filters and sorts the full list, resets the page, and selects only visible rows", () => {
  const { result } = renderHook(() => useListState(stateOptions))
  act(result.current.pagination.next)
  act(result.current.selection.toggleAll)
  expect(result.current.selection.selected).toEqual(stateRows.slice(12, 24))

  act(() => result.current.controls.setFacet("parity", ["0"]))
  expect(result.current.pagination.pageIndex).toBe(0)
  expect(result.current.pagination.visibleRows).toEqual([
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24,
  ])
  expect(result.current.selection.selected).toEqual([14, 16, 18, 20, 22, 24])
  expect(result.current.pagination.footerLabel).toBe(
    "Showing 1–12 of 15 matching rows"
  )

  act(result.current.pagination.next)
  act(() => result.current.controls.toggleSort("rank"))
  expect(result.current.pagination.pageIndex).toBe(0)
  act(() => result.current.controls.toggleSort("rank"))
  expect(result.current.pagination.visibleRows).toEqual([
    30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8,
  ])
  act(result.current.selection.toggleAll)
  expect(result.current.selection.selected).toEqual(
    result.current.pagination.visibleRows
  )
  act(result.current.pagination.next)
  expect(result.current.selection.count).toBe(0)
})

test("keeps caller filters and unfiltered totals separate from header controls", () => {
  const { result, rerender } = renderHook(
    ({ hasFilters }) =>
      useListState({ ...stateOptions, hasFilters, totalCount: 40 }),
    { initialProps: { hasFilters: true } }
  )
  expect(result.current.hasFilters).toBe(true)
  expect(result.current.pagination.footerLabel).toBe(
    "Showing 1–12 of 30 matching rows (40 total)"
  )
  act(() => result.current.controls.toggleSort("rank"))
  rerender({ hasFilters: false })
  expect(result.current.hasFilters).toBe(true)
  act(() => result.current.controls.toggleSort("rank"))
  act(() => result.current.controls.toggleSort("rank"))
  expect(result.current.hasFilters).toBe(false)
})

test("preserves readiness and clamps the page when loaded rows disappear", () => {
  const { result, rerender } = renderHook(
    (props) => useListState({ ...stateOptions, ...props }),
    { initialProps: { rows: stateRows, isReady: true } }
  )
  act(result.current.pagination.next)
  act(result.current.selection.toggleAll)
  rerender({ rows: [], isReady: false })
  expect(result.current.pagination.isReady).toBe(false)
  expect(result.current.pagination.pageIndex).toBe(0)
  expect(result.current.pagination.footerLabel).toBeUndefined()
  expect(result.current.selection.count).toBe(0)
  rerender({ rows: [], isReady: true })
  expect(result.current.pagination.isReady).toBe(true)
  expect(result.current.pagination.canGoNext).toBe(false)
})
