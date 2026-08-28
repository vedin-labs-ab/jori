import { useMutation, useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import {
  conflictMessage,
  isVersionConflict,
} from "../../shared/materials/conflict"
import { rowPageSize, type TableRow } from "../types"

/** Cursor-stack pagination over pageRows: each visited page keeps its
 *  cursor so Previous re-reads the same window, and the reactive query
 *  keeps the visible page fresh. */
export function useRowPages(
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const [cursors, setCursors] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const page = useQuery(api.tables.console.pageRows, {
    organizationId,
    tableId,
    paginationOpts: {
      numItems: rowPageSize,
      cursor: cursors[pageIndex] ?? null,
    },
  })
  const rows = page?.rows ?? []

  function next() {
    if (page === undefined || page.isDone) {
      return
    }

    setCursors((current) => [
      ...current.slice(0, pageIndex + 1),
      page.continueCursor,
    ])
    setPageIndex((current) => current + 1)
  }

  return {
    canGoNext: page !== undefined && !page.isDone,
    footerLabel: rowFooterLabel(pageIndex, rows.length, page?.isDone),
    isLoading: page === undefined && pageIndex === 0,
    isReady: page !== undefined,
    next,
    pageIndex,
    previous: () => setPageIndex((current) => Math.max(0, current - 1)),
    rows,
  }
}

export function rowFooterLabel(
  pageIndex: number,
  rowCount: number,
  isDone: boolean | undefined
) {
  if (rowCount === 0) {
    return undefined
  }

  const rangeStart = pageIndex * rowPageSize + 1
  const rangeEnd = pageIndex * rowPageSize + rowCount

  return `Showing rows ${rangeStart}–${rangeEnd}${isDone === true ? "" : " of more"}`
}

/** Row writes with the optimistic-version handshake: a stale write toasts
 *  and the already-refreshed grid shows what won. */
export function useRowWrites(
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const insert = useMutation(api.tables.console.insertRow)
  const update = useMutation(api.tables.console.updateRow)
  const remove = useMutation(api.tables.console.removeRow)
  const [pendingRowId, setPendingRowId] = useState<TableRow["rowId"]>()

  const insertRow = (values: Record<string, unknown>) =>
    run(
      () => insert({ organizationId, tableId, values }),
      "Could not add the row."
    )

  async function updateCell(row: TableRow, key: string, value: unknown) {
    setPendingRowId(row.rowId)

    const ok = await run(
      () =>
        update({
          organizationId,
          tableId,
          rowId: row.rowId,
          values: { [key]: value ?? null },
          expectedVersion: row.version,
        }),
      "Could not update the row."
    )

    setPendingRowId(undefined)

    return ok
  }

  async function deleteRow(row: TableRow) {
    setPendingRowId(row.rowId)

    const ok = await run(
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

    return ok
  }

  return { deleteRow, insertRow, pendingRowId, updateCell }
}

async function run(action: () => Promise<unknown>, fallback: string) {
  try {
    await action()

    return true
  } catch (error) {
    if (isVersionConflict(error)) {
      toast.error(conflictMessage("row"))
    } else {
      showErrorToast(error, fallback)
    }

    return false
  }
}
