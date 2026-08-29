import { MoveResourceDialog } from "../../folders/move"
import { SelectionActionsBar } from "../../shared/list/bar"
import { type RowSelection } from "../../shared/list/selection"
import { EditTableDialog } from "../edit"
import { type TableDetail, type TableRow } from "../types"
import { AddRowDialog } from "./add"
import { ColumnSheet, type ColumnSheetState } from "./columns"
import { rowNoun, type useRowBulk, type useRowWrites } from "./rows"
import { TableLinksDialog } from "./share"

export type TableDialog = "add" | "edit" | "move" | "share"

/** Everything floating over the grid: the selection bar, the column sheet,
 *  and the page's dialogs. */
export function TableOverlays({
  bulk,
  columnSheet,
  dialog,
  onCloseDialog,
  onColumnSheet,
  organizationId,
  selection,
  table,
  writes,
}: {
  bulk: ReturnType<typeof useRowBulk>
  columnSheet: ColumnSheetState | undefined
  dialog: TableDialog | undefined
  onCloseDialog: () => void
  onColumnSheet: (state: ColumnSheetState | undefined) => void
  organizationId: string
  selection: RowSelection<TableRow>
  table: TableDetail
  writes: ReturnType<typeof useRowWrites>
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
        onClose={onCloseDialog}
        organizationId={organizationId}
        table={table}
        writes={writes}
      />
    </>
  )
}

function TableDialogs({
  dialog,
  onClose,
  organizationId,
  table,
  writes,
}: {
  dialog: TableDialog | undefined
  onClose: () => void
  organizationId: string
  table: TableDetail
  writes: ReturnType<typeof useRowWrites>
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
        onSubmit={writes.insertRow}
      />
      <EditTableDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        table={dialog === "edit" ? table : undefined}
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
