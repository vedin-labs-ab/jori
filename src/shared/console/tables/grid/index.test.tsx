// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { emptySelection } from "../../../../../test/list/selection"
import { type TableColumn, type TableRow } from "../types"
import { RowGrid } from "."

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const loadMore = vi.fn()

// jsdom has no layout, so the scrollport would measure 0x0 and the
// virtualizer would mount nothing. A desktop-sized viewport (measured via
// offsetWidth/offsetHeight) gives the window real bounds.
beforeEach(() => {
  loadMore.mockReset()
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800)
})

const columns: TableColumn[] = [{ id: "title", name: "Title", type: "string" }]

function buildRows(count: number): TableRow[] {
  return Array.from({ length: count }, (_, index) => ({
    rowId: `documents:${index}` as TableRow["rowId"],
    values: { title: `Row ${index + 1}` },
    version: 1,
    createdAt: index,
    updatedAt: index,
  }))
}

function renderGrid(rows: TableRow[], options?: { isExhausted?: boolean }) {
  render(
    <RowGrid
      columns={columns}
      disabled={false}
      freshRowId={undefined}
      isExhausted={options?.isExhausted ?? true}
      isLoading={false}
      isLoadingMore={false}
      loadMore={loadMore}
      onAddColumn={() => undefined}
      onAddRow={() => undefined}
      onCommit={vi.fn().mockResolvedValue(true)}
      onDeleteRow={() => undefined}
      onDuplicateRow={() => undefined}
      onFreshSettled={() => undefined}
      onInsertRow={() => undefined}
      onInspectColumn={() => undefined}
      pendingRowId={undefined}
      rows={rows}
      selection={emptySelection()}
    />
  )
}

test("a fully loaded table mounts only a small window and requests no more rows", () => {
  renderGrid(buildRows(10_000))

  const mounted = screen.getAllByRole("button", { name: /Edit Title$/ })

  expect(mounted.length).toBeGreaterThan(0)
  expect(mounted.length).toBeLessThan(50)
  expect(screen.getByTitle("Row 1")).toBeTruthy()
  expect(screen.queryByTitle("Row 9999")).toBeNull()
  expect(loadMore).not.toHaveBeenCalled()
  expect(screen.getByText("New row")).toBeTruthy()
})

test("nearing the end of the loaded rows requests the next page", () => {
  renderGrid(buildRows(30), { isExhausted: false })

  expect(loadMore).toHaveBeenCalled()
  // The end of the table is not on screen yet, so appending stays hidden
  // behind the honest loading band.
  expect(screen.queryByText("New row")).toBeNull()
  expect(screen.getByText("Loading more rows…")).toBeTruthy()
})

// The grid is divs placed by hand, so its roles are all a screen reader
// has to tell a table from a run of buttons.
test("reads as a table whose counts cover the rows that are not mounted", () => {
  renderGrid(buildRows(10_000))

  const table = screen.getByRole("table", { name: "Rows" })
  const [head, first] = screen.getAllByRole("row")

  // The header and the gutter each count for one.
  expect(table.getAttribute("aria-rowcount")).toBe("10001")
  expect(table.getAttribute("aria-colcount")).toBe("2")
  expect(head?.getAttribute("aria-rowindex")).toBe("1")
  expect(first?.getAttribute("aria-rowindex")).toBe("2")
  // Named by the column alone, which is what each cell is read under.
  expect(screen.getByRole("columnheader", { name: "Title" })).toBeTruthy()
  expect(screen.getAllByRole("cell").length).toBeGreaterThan(0)
})

test("says the row count is unknown while more rows remain to load", () => {
  renderGrid(buildRows(30), { isExhausted: false })

  expect(screen.getByRole("table").getAttribute("aria-rowcount")).toBe("-1")
})
