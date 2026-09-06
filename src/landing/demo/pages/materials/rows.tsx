import { type ComponentProps, useCallback, useState } from "react"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import {
  type RowSelection,
  useRowSelection,
} from "@/shared/console/list/selection"
import { closeOnDismiss } from "@/shared/console/retain"
import { AddRowDialog } from "@/shared/console/tables/add"
import { rowNoun, useRowAdding } from "@/shared/console/tables/adding"
import { useColumnSheetForm } from "@/shared/console/tables/column"
import { type RowGrid } from "@/shared/console/tables/grid"
import {
  ColumnSheet,
  type ColumnSheetState,
} from "@/shared/console/tables/sheet"
import {
  type RowInsertAnchor,
  type TableDetail,
  type TableRow,
} from "@/shared/console/tables/types"
import { DemoLinksDialog } from "../../dialogs/links"
import { type DemoActions } from "../../state/actions"
import { useDemoWorkspace } from "../../workspace"

/** The box the grid assumes before it can measure one, so a server render
 *  places the first rows rather than an empty canvas. */
const initialRect = { height: 240, width: 960 }

const rowRemoval = {
  description: "The selected rows are removed from the table permanently.",
  isDestructive: true,
  label: "Delete",
}

type GridState = ReturnType<typeof useGridState>

/** The console's grid over the workspace, as the props RowGrid takes and
 *  the overlays around it — the selection bar, the column sheet, the
 *  add-row and share dialogs — so the table's page and the chat's pane
 *  mount the same grid: cells commit, rows insert, duplicate, and delete,
 *  columns are added and inspected, and share links mint against the
 *  workspace's. */
export function useDemoGrid(table: TableDetail, rows: TableRow[]) {
  const { actions } = useDemoWorkspace()
  const grid = useGridState(table)
  const selection = useRowSelection({
    identify: (row: TableRow) => row.rowId,
    rows,
  })

  return {
    openShare: () => grid.setDialog("share"),
    overlays: (
      <>
        {selectionBar(selection, table, actions)}
        {gridDialogs(grid, table)}
      </>
    ),
    props: gridProps(table, rows, grid, selection, actions),
  }
}

function useGridState(table: TableDetail) {
  const { actions } = useDemoWorkspace()
  const [dialog, setDialog] = useState<"add" | "share">()
  const [columnSheet, setColumnSheet] = useState<ColumnSheetState>()
  const insertRow = useCallback(
    (values: Record<string, unknown>, anchor?: RowInsertAnchor) =>
      Promise.resolve(actions.insertRow(table.tableId, values, anchor)),
    [actions, table.tableId]
  )
  const adding = useRowAdding(table.columns, insertRow, () => setDialog("add"))
  const columnForm = useColumnSheetForm({
    onOpenChange: closeOnDismiss(() => setColumnSheet(undefined)),
    onSave: (columns) => {
      actions.setColumns(table.tableId, columns)

      return Promise.resolve()
    },
    state: columnSheet,
    table,
  })

  return { adding, columnForm, columnSheet, dialog, setColumnSheet, setDialog }
}

function gridProps(
  table: TableDetail,
  rows: TableRow[],
  grid: GridState,
  selection: RowSelection<TableRow>,
  actions: DemoActions
): ComponentProps<typeof RowGrid> {
  return {
    columns: table.columns,
    disabled: false,
    freshRowId: grid.adding.freshRowId,
    initialRect,
    isExhausted: true,
    isLoading: false,
    isLoadingMore: false,
    loadMore: () => undefined,
    onAddColumn: () => grid.setColumnSheet({ mode: "create" }),
    onAddRow: () => void grid.adding.addRow(),
    onCommit: (row, columnId, value) => {
      actions.commitCell(table.tableId, row.rowId, columnId, value)

      return Promise.resolve(true)
    },
    onDeleteRow: (row) => actions.deleteRow(table.tableId, row.rowId),
    onDuplicateRow: (row) =>
      actions.insertRow(
        table.tableId,
        { ...row.values },
        { rowId: row.rowId, placement: "below" }
      ),
    onFreshSettled: grid.adding.settle,
    onInsertRow: (row, placement) =>
      void grid.adding.addRow({ rowId: row.rowId, placement }),
    onInspectColumn: (column) =>
      grid.setColumnSheet({ mode: "edit", id: column.id }),
    pendingRowId: undefined,
    rows,
    selection,
  }
}

/** The bar over the selected rows: clear them, or delete them together. */
function selectionBar(
  selection: RowSelection<TableRow>,
  table: TableDetail,
  actions: DemoActions
) {
  return (
    <SelectionActionsBar
      count={selection.count}
      isBusy={false}
      noun={rowNoun}
      onClear={selection.clear}
      onRemove={() => {
        for (const row of selection.selected) {
          actions.deleteRow(table.tableId, row.rowId)
        }
      }}
      removal={rowRemoval}
    />
  )
}

function gridDialogs(grid: GridState, table: TableDetail) {
  return (
    <>
      <ColumnSheet
        form={grid.columnForm}
        onOpenChange={closeOnDismiss(() => grid.setColumnSheet(undefined))}
        state={grid.columnSheet}
        table={table}
      />
      <AddRowDialog
        columns={table.columns}
        isOpen={grid.dialog === "add"}
        onOpenChange={(open) => grid.setDialog(open ? "add" : undefined)}
        onSubmit={grid.adding.submitDialog}
      />
      <DemoLinksDialog
        kind="table"
        materialId={table.tableId}
        onOpenChange={(open) => grid.setDialog(open ? "share" : undefined)}
        open={grid.dialog === "share"}
      />
    </>
  )
}
