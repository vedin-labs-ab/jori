import { MoveResourceDialog } from "../../folders/move"
import { SelectionActionsBar } from "../../shared/list/bar"
import { type RowSelection } from "../../shared/list/selection"
import { VisibilityDialog } from "../../shared/visibility/dialog"
import { EditTableDialog } from "../edit"
import { type TableDetail, type TableRow } from "../types"
import { AddRowDialog } from "./add"
import { type ColumnSheetState } from "./column/form"
import { ColumnSheet } from "./column/sheet"
import { rowNoun, type useRowBulk } from "./rows"
import { TableLinksDialog } from "./share"

export type TableDialog = "access" | "add" | "edit" | "move" | "share"

/** Everything floating over the grid: the selection bar, the column sheet,
 *  and the page's dialogs. */
export function TableOverlays({
  bulk,
  columnSheet,
  dialog,
  onAddRow,
  onCloseDialog,
  onColumnSheet,
  organizationId,
  selection,
  table,
}: {
  bulk: ReturnType<typeof useRowBulk>
  columnSheet: ColumnSheetState | undefined
  dialog: TableDialog | undefined
  onAddRow: (
    values: Record<string, unknown>
  ) => Promise<TableRow["rowId"] | null>
  onCloseDialog: () => void
  onColumnSheet: (state: ColumnSheetState | undefined) => void
  organizationId: string
  selection: RowSelection<TableRow>
  table: TableDetail
}) {
  return (
    <>
      <SelectionActionsBar
        count={selection.count}
        isBusy={bulk.isBusy}
        noun={rowNoun}
        onClear={selection.clear}
        onRemove={bulk.removeSelected}
        removal={{
          description:
            "The selected rows are removed from the table permanently.",
          isDestructive: true,
          label: "Delete",
        }}
      />
      <ColumnSheet
        onOpenChange={(open) => {
          if (!open) {
            onColumnSheet(undefined)
          }
        }}
        organizationId={organizationId}
        state={columnSheet}
        table={table}
      />
      <TableDialogs
        dialog={dialog}
        onAddRow={onAddRow}
        onClose={onCloseDialog}
        organizationId={organizationId}
        table={table}
      />
    </>
  )
}

function TableDialogs({
  dialog,
  onAddRow,
  onClose,
  organizationId,
  table,
}: {
  dialog: TableDialog | undefined
  onAddRow: (
    values: Record<string, unknown>
  ) => Promise<TableRow["rowId"] | null>
  onClose: () => void
  organizationId: string
  table: TableDetail
}) {
  function closeWhenDismissed(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  return (
    <>
      <AddRowDialog
        columns={table.columns}
        isOpen={dialog === "add"}
        onOpenChange={closeWhenDismissed}
        onSubmit={onAddRow}
      />
      <EditTableDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        table={dialog === "edit" ? table : undefined}
      />
      <VisibilityDialog
        noun="table"
        onOpenChange={closeWhenDismissed}
        open={dialog === "access"}
        organizationId={organizationId}
        ownerId={table.ownerId}
        target={{ kind: "table", id: table.tableId }}
        value={table.visibility}
      />
      <TableLinksDialog
        onOpenChange={closeWhenDismissed}
        open={dialog === "share"}
        organizationId={organizationId}
        tableId={table.tableId}
      />
      <MoveResourceDialog
        onClose={onClose}
        organizationId={organizationId}
        resource={
          dialog === "move"
            ? {
                resourceType: "collection",
                resourceId: table.tableId,
                name: table.name,
                folderId: table.folderId,
              }
            : undefined
        }
      />
    </>
  )
}
