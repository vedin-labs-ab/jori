// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type RowSelection } from "@/shared/console/list/selection"
import { type TableColumn, type TableRow } from "../types"
import { RowGrid } from "./grid"

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
      selection={stubSelection()}
    />
  )
}

test("10,000 loaded rows mount only a small window of cells", () => {
  renderGrid(buildRows(10_000))

  const mounted = screen.getAllByRole("button", { name: "Edit Title" })

  expect(mounted.length).toBeGreaterThan(0)
  expect(mounted.length).toBeLessThan(50)
  expect(screen.getByTitle("Row 1")).toBeTruthy()
  expect(screen.queryByTitle("Row 9999")).toBeNull()
})

test("nearing the end of the loaded rows requests the next page", () => {
  renderGrid(buildRows(30), { isExhausted: false })

  expect(loadMore).toHaveBeenCalled()
  // The end of the table is not on screen yet, so appending stays hidden
  // behind the honest loading band.
  expect(screen.queryByText("New row")).toBeNull()
  expect(screen.getByText("Loading more rows…")).toBeTruthy()
})

test("far from the end of a fully loaded table nothing more is requested", () => {
  renderGrid(buildRows(10_000))

  expect(loadMore).not.toHaveBeenCalled()
  expect(screen.getByText("New row")).toBeTruthy()
})
