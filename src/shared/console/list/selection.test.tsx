// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { useListState } from "./controls"

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
