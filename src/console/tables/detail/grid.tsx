import { type ComponentProps, useState } from "react"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import {
  type RowSelection,
  useRowSelection,
} from "@/shared/console/list/selection"
import { closeOnDismiss } from "@/shared/console/retain"
import { AddRowDialog } from "@/shared/console/tables/add"
import { rowNoun, useRowAdding } from "@/shared/console/tables/adding"
import { type RowGrid } from "@/shared/console/tables/grid"
import { type ColumnSheetState } from "@/shared/console/tables/sheet"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { TableColumnSheet } from "./column/sheet"
import { useRowBulk, useRowPages, useRowWrites } from "./rows"

const rowRemoval = {
  description: "The selected rows are removed from the table permanently.",
  isDestructive: true,
  label: "Delete",
}

type GridState = ReturnType<typeof useGridState>

/** The console's grid over the table's rows, as the props RowGrid takes
 *  and the overlays its actions open — the selection bar, the column
 *  sheet, the add-row dialog — so the table's page and the chat's pane
 *  mount the same grid: cells commit, rows insert, duplicate, and delete,
 *  columns are added and inspected, every write through the table's own
 *  mutations. */
export function useTableGrid(organizationId: string, table: TableDetail) {
  const grid = useGridState(organizationId, table)
  const selection = useRowSelection({
    identify: (row: TableRow) => row.rowId,
    rows: grid.pages.rows,
  })
  const bulk = useRowBulk(organizationId, table.tableId, selection)

  return {
    overlays: (
      <>
        <SelectionActionsBar
          count={selection.count}
          isBusy={bulk.isBusy}
          noun={rowNoun}
          onClear={selection.clear}
          onRemove={bulk.removeSelected}
          removal={rowRemoval}
        />
        <TableColumnSheet
          onOpenChange={closeOnDismiss(() => grid.setColumnSheet(undefined))}
          organizationId={organizationId}
          state={grid.columnSheet}
          table={table}
        />
        <AddRowDialog
          columns={table.columns}
          isOpen={grid.isAdding}
          onOpenChange={closeOnDismiss(() => grid.setIsAdding(false))}
          onSubmit={grid.adding.submitDialog}
        />
      </>
    ),
    props: gridProps(table, grid, selection),
  }
}

function useGridState(organizationId: string, table: TableDetail) {
  const pages = useRowPages(organizationId, table.tableId)
  const writes = useRowWrites(organizationId, table.tableId)
  const [isAdding, setIsAdding] = useState(false)
  const [columnSheet, setColumnSheet] = useState<ColumnSheetState>()
  const adding = useRowAdding(table.columns, writes.insertRow, () =>
    setIsAdding(true)
  )

  return {
    adding,
    columnSheet,
    isAdding,
    pages,
    setColumnSheet,
    setIsAdding,
    writes,
  }
}

function gridProps(
  table: TableDetail,
  grid: GridState,
  selection: RowSelection<TableRow>
): ComponentProps<typeof RowGrid> {
  const { adding, pages, writes } = grid

  return {
    columns: table.columns,
    disabled: table.archivedAt !== undefined,
    freshRowId: adding.freshRowId,
    isExhausted: pages.isExhausted,
    isLoading: pages.isLoading,
    isLoadingMore: pages.isLoadingMore,
    loadMore: pages.loadMore,
    onAddColumn: () => grid.setColumnSheet({ mode: "create" }),
    onAddRow: () => void adding.addRow(),
    onCommit: writes.updateCell,
    onDeleteRow: (row) => void writes.deleteRow(row),
    onDuplicateRow: (row) => void writes.duplicateRow(row),
    onFreshSettled: adding.settle,
    onInsertRow: (row, placement) =>
      void adding.addRow({ rowId: row.rowId, placement }),
    onInspectColumn: (column) =>
      grid.setColumnSheet({ mode: "edit", id: column.id }),
    pendingRowId: writes.pendingRowId,
    rows: pages.rows,
    selection,
  }
}
