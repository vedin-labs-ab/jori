import { useCallback, useState } from "react"
import { countLabel } from "@/shared/console/count"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import {
  type RowSelection,
  useRowSelection,
} from "@/shared/console/list/selection"
import { MaterialHeaderActions } from "@/shared/console/materials/detail/header"
import { AddRowDialog } from "@/shared/console/tables/add"
import { rowNoun, useRowAdding } from "@/shared/console/tables/adding"
import { useColumnSheetForm } from "@/shared/console/tables/column"
import { RowGrid } from "@/shared/console/tables/grid"
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
import { useDemoWorkspace } from "../../workspace"

/** The box the grid assumes before it can measure one, so a server render
 *  places the first rows rather than an empty canvas. */
const initialRect = { height: 240, width: 960 }

const rowRemoval = {
  description: "The selected rows are removed from the table permanently.",
  isDestructive: true,
  label: "Delete",
}

type GridProps = { rows: TableRow[]; table: TableDetail }
type GridState = ReturnType<typeof useGridState>

/** The console's grid over the workspace: cells commit, rows insert,
 *  duplicate, and delete, columns are added and inspected, and the share
 *  links dialog mints against the workspace's links. */
export function TableGrid({ rows, table }: GridProps) {
  const grid = useGridState(table)
  const selection = useRowSelection({
    identify: (row: TableRow) => row.rowId,
    rows,
  })

  return (
    <ConsoleListLayout>
      <MaterialHeaderActions
        isExporting={false}
        onExport={() => undefined}
        onShare={() => grid.setDialog("share")}
      />
      <DemoRowGrid
        grid={grid}
        rows={rows}
        selection={selection}
        table={table}
      />
      <ConsoleListFooter>
        <p className="text-muted-foreground text-xs">
          {countLabel(rows.length, "row")}
        </p>
      </ConsoleListFooter>
      <RowSelectionBar selection={selection} table={table} />
      <GridDialogs grid={grid} table={table} />
    </ConsoleListLayout>
  )
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
    onOpenChange: (open) => {
      if (!open) {
        setColumnSheet(undefined)
      }
    },
    onSave: (columns) => {
      actions.setColumns(table.tableId, columns)

      return Promise.resolve()
    },
    state: columnSheet,
    table,
  })

  return { adding, columnForm, columnSheet, dialog, setColumnSheet, setDialog }
}

function DemoRowGrid({
  grid,
  rows,
  selection,
  table,
}: GridProps & { grid: GridState; selection: RowSelection<TableRow> }) {
  const { actions } = useDemoWorkspace()

  return (
    <RowGrid
      columns={table.columns}
      disabled={false}
      freshRowId={grid.adding.freshRowId}
      initialRect={initialRect}
      isExhausted
      isLoading={false}
      isLoadingMore={false}
      loadMore={() => undefined}
      onAddColumn={() => grid.setColumnSheet({ mode: "create" })}
      onAddRow={() => void grid.adding.addRow()}
      onCommit={(row, columnId, value) => {
        actions.commitCell(table.tableId, row.rowId, columnId, value)

        return Promise.resolve(true)
      }}
      onDeleteRow={(row) => actions.deleteRow(table.tableId, row.rowId)}
      onDuplicateRow={(row) =>
        actions.insertRow(
          table.tableId,
          { ...row.values },
          { rowId: row.rowId, placement: "below" }
        )
      }
      onFreshSettled={grid.adding.settle}
      onInsertRow={(row, placement) =>
        void grid.adding.addRow({ rowId: row.rowId, placement })
      }
      onInspectColumn={(column) =>
        grid.setColumnSheet({ mode: "edit", id: column.id })
      }
      pendingRowId={undefined}
      rows={rows}
      selection={selection}
    />
  )
}

function RowSelectionBar({
  selection,
  table,
}: {
  selection: RowSelection<TableRow>
  table: TableDetail
}) {
  const { actions } = useDemoWorkspace()

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

function GridDialogs({ grid, table }: { grid: GridState; table: TableDetail }) {
  return (
    <>
      <ColumnSheet
        form={grid.columnForm}
        onOpenChange={(open) => {
          if (!open) {
            grid.setColumnSheet(undefined)
          }
        }}
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
