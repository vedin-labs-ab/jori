import { useMutation, usePaginatedQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  conflictMessage,
  isVersionConflict,
} from "@/shared/console/materials/conflict"
import { api } from "../../../../convex/_generated/api"
import {
  type RowInsertAnchor,
  rowPageSize,
  type TableColumn,
  type TableRow,
} from "../types"
import { buildRowValues } from "./cells"

/** Endless-scroll pagination over pageRows: pages accumulate as the grid
 *  scrolls, every loaded page stays reactive, and the tail page grows in
 *  place when rows append past it. */
export function useRowPages(
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const { isLoading, loadMore, results, status } = usePaginatedQuery(
    api.tables.console.pageRows,
    { organizationId, tableId },
    { initialNumItems: rowPageSize }
  )

  return {
    isExhausted: status === "Exhausted",
    isLoading: isLoading && results.length === 0,
    isLoadingMore: status === "LoadingMore",
    loadMore: () => loadMore(rowPageSize),
    rows: results,
  }
}

/** Row writes with the optimistic-version handshake: a stale write toasts
 *  and the already-refreshed grid shows what won. Inserts hand back the new
 *  row's id so the grid can spotlight its first cell. */
export function useRowWrites(
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const insert = useMutation(api.tables.console.insertRow)
  const update = useMutation(api.tables.console.updateRow)
  const remove = useMutation(api.tables.console.removeRow)
  const [pendingRowId, setPendingRowId] = useState<TableRow["rowId"]>()

  async function insertRow(
    values: Record<string, unknown>,
    anchor?: RowInsertAnchor
  ) {
    const inserted = await run(
      () => insert({ organizationId, tableId, values, anchor }),
      "Could not add the row."
    )

    return inserted === null ? null : (inserted as TableRow).rowId
  }

  async function updateCell(row: TableRow, columnId: string, value: unknown) {
    setPendingRowId(row.rowId)

    const outcome = await run(
      () =>
        update({
          organizationId,
          tableId,
          rowId: row.rowId,
          values: { [columnId]: value ?? null },
          expectedVersion: row.version,
        }),
      "Could not update the row."
    )

    setPendingRowId(undefined)

    return outcome !== null
  }

  async function deleteRow(row: TableRow) {
    setPendingRowId(row.rowId)

    const outcome = await run(
      () =>
        remove({
          organizationId,
          tableId,
          rowId: row.rowId,
          expectedVersion: row.version,
        }),
      "Could not delete the row."
    )

    setPendingRowId(undefined)

    return outcome !== null
  }

  /** The copy lands directly below its source, visibly, so no toast. */
  async function duplicateRow(row: TableRow) {
    await insertRow({ ...row.values }, { rowId: row.rowId, placement: "below" })
  }

  return { deleteRow, duplicateRow, insertRow, pendingRowId, updateCell }
}

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

export const rowNoun = { plural: "rows", singular: "row" }

/** The selection bar's delete action: one per-row delete mutation per
 *  selected row through the shared bulk runner, summarized in one toast.
 *  Rows that disappear drop out of the selection on their own. */
export function useRowBulk(
  organizationId: string,
  tableId: GenericId<"collections">,
  selection: RowSelection<TableRow>
) {
  const remove = useMutation(api.tables.console.removeRow)
  const runner = useBulkRunner()

  function removeSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) =>
        remove({
          organizationId,
          tableId,
          rowId: row.rowId,
          expectedVersion: row.version,
        }),
      {
        noun: rowNoun.plural,
        success: `Deleted ${countNoun(rows.length, rowNoun)}.`,
        verb: "delete",
      }
    )
  }

  return { isBusy: runner.isBusy, removeSelected }
}

async function run<Result>(
  action: () => Promise<Result>,
  fallback: string
): Promise<Result | null> {
  try {
    return await action()
  } catch (error) {
    if (isVersionConflict(error)) {
      toast.error(conflictMessage("row"))
    } else {
      showErrorToast(error, fallback)
    }

    return null
  }
}
