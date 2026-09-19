// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { useListState } from "../controls"

afterEach(cleanup)
const stateOptions = {
  config: { facets: {}, sorts: { name: String } },
  identify: String,
  isReady: true,
  noun: { singular: "row", plural: "rows" },
}

test("disabled rows stay visible but cannot enter selection until released", () => {
  const { result, rerender } = renderHook(
    ({ editing }) =>
      useListState({
        ...stateOptions,
        rows: [1, 2],
        disabled: (row) => editing && row === 2,
      }),
    { initialProps: { editing: true } }
  )
  expect(result.current.pagination.visibleRows).toEqual([1, 2])
  act(result.current.selection.toggleAll)
  expect(result.current.selection.selected).toEqual([1])
  expect(result.current.selection.allSelected).toBe(true)
  act(() => result.current.selection.toggle(2))
  expect(result.current.selection.isSelected(2)).toBe(false)
  rerender({ editing: false })
  expect(result.current.selection.allSelected).toBe(false)
  act(() => result.current.selection.toggle(2))
  expect(result.current.selection.selected).toEqual([1, 2])
})

test("a pick selects alone, toggles, or runs from the last plain pick", () => {
  const { result } = renderHook(() =>
    useListState({ ...stateOptions, rows: [1, 2, 3, 4, 5] })
  )
  const pick = (row: number, how?: "alone" | "toggle" | "range") =>
    act(() => result.current.selection.pick(row, how))

  pick(1)
  pick(2)
  expect(result.current.selection.selected).toEqual([2])

  pick(4, "range")
  expect(result.current.selection.selected).toEqual([2, 3, 4])

  // The run still starts from 2, whichever side the next target falls on.
  pick(1, "range")
  expect(result.current.selection.selected).toEqual([1, 2])

  pick(5, "toggle")
  pick(1, "toggle")
  expect(result.current.selection.selected).toEqual([2, 5])
})

test("a marquee's replace swaps the whole selection by id", () => {
  const { result } = renderHook(() =>
    useListState({ ...stateOptions, rows: [1, 2, 3] })
  )

  act(() => result.current.selection.pick(1))
  act(() => result.current.selection.replace(["2", "3"]))
  expect(result.current.selection.selected).toEqual([2, 3])
})
