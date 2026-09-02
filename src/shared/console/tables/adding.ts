import { useState } from "react"
import { buildRowValues } from "./cells"
import { type RowInsertAnchor, type TableColumn, type TableRow } from "./types"

export const rowNoun = { plural: "rows", singular: "row" }

/** Adding a row skips the dialog when a blank row already satisfies the
 *  schema (no required text-like columns): it lands instantly — at the
 *  anchor, or appended without one — and its first cell opens for editing.
 *  Tables with required columns fall back to the add-row dialog, which
 *  keeps the anchor so its row still lands in place. */
export function useRowAdding(
  columns: TableColumn[],
  insertRow: (
    values: Record<string, unknown>,
    anchor?: RowInsertAnchor
  ) => Promise<TableRow["rowId"] | null>,
  onNeedsDialog: () => void
) {
  const [freshRowId, setFreshRowId] = useState<TableRow["rowId"]>()
  const [dialogAnchor, setDialogAnchor] = useState<RowInsertAnchor>()

  async function addRow(anchor?: RowInsertAnchor) {
    const blank = buildRowValues(columns, {})

    if (!blank.ok) {
      setDialogAnchor(anchor)
      onNeedsDialog()

      return
    }

    const rowId = await insertRow(blank.values, anchor)

    if (rowId !== null) {
      setFreshRowId(rowId)
    }
  }

  return {
    addRow,
    freshRowId,
    settle: () => setFreshRowId(undefined),
    submitDialog: (values: Record<string, unknown>) =>
      insertRow(values, dialogAnchor),
  }
}
