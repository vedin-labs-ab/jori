// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useColumnSheetForm } from "./column"
import { type ColumnSheetState } from "./sheet"
import { type TableDetail } from "./types"

afterEach(cleanup)

test("retains the column draft through close and unrelated table updates", () => {
  const table = {
    columns: [{ id: "title", name: "Title", type: "string", required: true }],
  } as TableDetail
  const onOpenChange = vi.fn()
  const onSave = vi.fn()
  const state: ColumnSheetState = { mode: "edit", id: "title" }
  const initialProps: {
    state: ColumnSheetState | undefined
    table: TableDetail
  } = { state, table }
  const { result, rerender } = renderHook(
    (props: { state: ColumnSheetState | undefined; table: TableDetail }) =>
      useColumnSheetForm({ ...props, onOpenChange, onSave }),
    { initialProps }
  )
  act(() => result.current.update({ name: "Renamed title" }))
  rerender({ state, table: { ...table, rowCount: 3 } })
  expect(result.current.draft.name).toBe("Renamed title")

  rerender({ state: undefined, table })
  expect(result.current.draft.name).toBe("Renamed title")

  rerender({ state: { mode: "create" }, table })
  expect(result.current.draft.name).toBe("")
})
