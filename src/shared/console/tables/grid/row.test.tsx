// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type RowSelection } from "../../list/selection"
import { type TableColumn, type TableRow } from "../types"
import { GridRow } from "./row"

afterEach(cleanup)

const onCommit = vi.fn()
const onInsert = vi.fn()

beforeEach(() => {
  onCommit.mockReset()
  onCommit.mockResolvedValue(true)
  onInsert.mockReset()
})

const columns: TableColumn[] = [
  { id: "title", name: "Title", type: "string" },
  { id: "done", name: "Done", type: "boolean" },
  { id: "stage", name: "Stage", type: "string" },
]

const row: TableRow = {
  rowId: "documents:1" as TableRow["rowId"],
  values: { title: "Call Ada", stage: "new" },
  version: 1,
  createdAt: 1,
  updatedAt: 1,
}

function stubSelection(): RowSelection<TableRow> {
  return {
    allSelected: false,
    clear: () => undefined,
    count: 0,
    isSelected: () => false,
    selected: [],
    toggle: () => undefined,
    toggleAll: () => undefined,
  }
}

function renderRow() {
  return render(
    <GridRow
      columns={columns}
      disabled={false}
      isFresh={false}
      isPending={false}
      number={1}
      onCommit={onCommit}
      onDelete={() => undefined}
      onDuplicate={() => undefined}
      onFreshSettled={() => undefined}
      onInsert={onInsert}
      row={row}
      selection={stubSelection()}
      top={0}
    />
  )
}

function openMenu() {
  fireEvent.contextMenu(screen.getByRole("button", { name: "Edit Title" }))
}

test("the menu inserts rows anchored to this row, not a plain new row", () => {
  renderRow()
  openMenu()

  expect(screen.queryByText("New row")).toBeNull()

  fireEvent.click(screen.getByText("Insert row above"))
  expect(onInsert).toHaveBeenCalledWith(row, "above")

  openMenu()
  fireEvent.click(screen.getByText("Insert row below"))
  expect(onInsert).toHaveBeenCalledWith(row, "below")
})

test("Tab commits the draft and opens the next text-like cell", async () => {
  renderRow()
  fireEvent.click(screen.getByRole("button", { name: "Edit Title" }))

  const editor = screen.getByRole("textbox", { name: "Title value" })

  fireEvent.change(editor, { target: { value: "Call Grace" } })
  fireEvent.keyDown(editor, { key: "Tab" })

  await waitFor(() => {
    // The boolean column in between is skipped.
    expect(screen.getByRole("textbox", { name: "Stage value" })).toBeTruthy()
  })
  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test("an editor unmounting mid-edit commits its draft like a blur", () => {
  const view = renderRow()

  fireEvent.click(screen.getByRole("button", { name: "Edit Title" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Title value" }), {
    target: { value: "Call Grace" },
  })
  view.unmount()

  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test("an unmount after Escape or with an untouched draft commits nothing", () => {
  const escaped = renderRow()

  fireEvent.click(screen.getByRole("button", { name: "Edit Title" }))
  fireEvent.change(screen.getByRole("textbox", { name: "Title value" }), {
    target: { value: "Call Grace" },
  })
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Title value" }), {
    key: "Escape",
  })
  escaped.unmount()

  const untouched = renderRow()

  fireEvent.click(screen.getByRole("button", { name: "Edit Title" }))
  untouched.unmount()

  expect(onCommit).not.toHaveBeenCalled()
})

test("Shift+Tab at the row's first text cell just commits and closes", async () => {
  renderRow()
  fireEvent.click(screen.getByRole("button", { name: "Edit Title" }))

  const editor = screen.getByRole("textbox", { name: "Title value" })

  fireEvent.keyDown(editor, { key: "Tab", shiftKey: true })

  await waitFor(() => {
    expect(screen.queryByRole("textbox")).toBeNull()
  })
  expect(onCommit).not.toHaveBeenCalled()
})
