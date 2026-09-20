// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { emptySelection } from "../../../../../test/list/selection"
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

function renderRow(fields = columns) {
  return render(
    <GridRow
      columns={fields}
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
      selection={emptySelection()}
      top={0}
    />
  )
}

function openMenu() {
  fireEvent.contextMenu(screen.getByRole("button", { name: /Edit Title$/ }))
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
  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))

  const editor = screen.getByRole("textbox", { name: "Title value" })

  fireEvent.change(editor, { target: { value: "Call Grace" } })
  fireEvent.keyDown(editor, { key: "Tab" })

  await waitFor(() => {
    // The boolean column in between is skipped.
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Stage value" })
    )
  })
  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test("an invalid cell keeps its draft and focus with feedback outside the grid", async () => {
  const view = renderRow(
    columns.map((column) =>
      column.id === "title" ? { ...column, required: true } : column
    )
  )
  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))

  const editor = screen.getByRole("textbox", { name: "Title value" })

  fireEvent.change(editor, { target: { value: "" } })
  fireEvent.keyDown(editor, { key: "Tab" })

  await waitFor(() => expect(editor.getAttribute("aria-invalid")).toBe("true"))
  expect(screen.getByRole("alert").textContent).toBe("Title is required.")
  expect(editor.getAttribute("aria-describedby")).toBe(
    screen.getByRole("alert").id
  )
  expect(view.container.contains(screen.getByRole("tooltip"))).toBe(false)
  expect(document.activeElement).toBe(editor)
  expect((editor as HTMLInputElement).value).toBe("")
  expect(onCommit).not.toHaveBeenCalled()

  fireEvent.change(editor, { target: { value: "Call Grace" } })
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByRole("tooltip")).toBeNull()
  expect(editor.getAttribute("aria-invalid")).toBeNull()
  expect(editor.getAttribute("aria-describedby")).toBeNull()
  fireEvent.keyDown(editor, { key: "Tab" })

  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Stage value" })).toBeTruthy()
  )
  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test("an editor unmounting mid-edit commits its draft like a blur", () => {
  const view = renderRow()

  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
  fireEvent.change(screen.getByRole("textbox", { name: "Title value" }), {
    target: { value: "Call Grace" },
  })
  view.unmount()

  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test("an unmount after Escape or with an untouched draft commits nothing", async () => {
  const escaped = renderRow()

  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
  fireEvent.change(screen.getByRole("textbox", { name: "Title value" }), {
    target: { value: "Call Grace" },
  })
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Title value" }), {
    key: "Escape",
  })
  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Edit Title$/ })
    )
  })
  escaped.unmount()

  const untouched = renderRow()

  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
  untouched.unmount()

  expect(onCommit).not.toHaveBeenCalled()
})

test.each([
  { column: "Title", shiftKey: true },
  { column: "Stage", shiftKey: false },
])(
  "Tab at the $column boundary closes and returns focus to its cell",
  async ({ column, shiftKey }) => {
    renderRow()
    const name = new RegExp(`Edit ${column}$`)
    fireEvent.click(screen.getByRole("button", { name }))
    const editor = screen.getByRole("textbox", { name: `${column} value` })

    fireEvent.keyDown(editor, { key: "Tab", shiftKey })

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).toBeNull()
      expect(document.activeElement).toBe(screen.getByRole("button", { name }))
    })
    expect(onCommit).not.toHaveBeenCalled()
  }
)

test("Enter returns focus to the saved cell", async () => {
  renderRow()
  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
  const editor = screen.getByRole("textbox", { name: "Title value" })
  fireEvent.change(editor, { target: { value: "Call Grace" } })
  fireEvent.keyDown(editor, { key: "Enter" })

  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Edit Title$/ })
    )
  })
  expect(onCommit).toHaveBeenCalledWith(row, "title", "Call Grace")
})

test.each(["Enter", "Tab"])(
  "a slow %s save keeps focus where the person moved it",
  async (key) => {
    let resolveCommit: (committed: boolean) => void = () => undefined
    const pending = new Promise<boolean>((resolve) => {
      resolveCommit = resolve
    })
    onCommit.mockReturnValue(pending)
    renderRow()
    fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
    const editor = screen.getByRole("textbox", { name: "Title value" })
    fireEvent.change(editor, { target: { value: "Call Grace" } })
    fireEvent.keyDown(editor, { key })
    const destination = screen.getByRole("checkbox", {
      name: "Done for this row",
    })
    destination.focus()

    await act(async () => resolveCommit(true))
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull())
    expect(document.activeElement).toBe(destination)
  }
)

test("Escape closes a pending Tab edit without advancing when its save finishes", async () => {
  let resolveCommit: (committed: boolean) => void = () => undefined
  const pending = new Promise<boolean>((resolve) => {
    resolveCommit = resolve
  })
  onCommit.mockReturnValue(pending)
  renderRow()
  fireEvent.click(screen.getByRole("button", { name: /Edit Title$/ }))
  const editor = screen.getByRole("textbox", { name: "Title value" })
  fireEvent.change(editor, { target: { value: "Call Grace" } })
  fireEvent.keyDown(editor, { key: "Tab" })
  fireEvent.keyDown(editor, { key: "Escape" })

  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Edit Title$/ })
    )
  })
  await act(async () => resolveCommit(true))

  expect(screen.queryByRole("textbox")).toBeNull()
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: /Edit Title$/ })
  )
  expect(onCommit).toHaveBeenCalledOnce()
})
