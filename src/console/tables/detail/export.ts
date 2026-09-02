import { type ConvexReactClient, useConvex } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { serializeCsv } from "@/console/tables/csv"
import { showErrorToast } from "@/shared/console/error"
import { downloadTextFile, toFilename } from "@/shared/files/download"
import { api } from "../../../../convex/_generated/api"
import {
  type TableColumn,
  type TableDetail,
  type TableRow,
  type TableRowPage,
} from "../types"

const exportPageSize = 200

/** Download the whole table as CSV, paging through pageRows and
 *  assembling the file on the client. */
export function useCsvExport(organizationId: string, table: TableDetail) {
  const convex = useConvex()
  const [isExporting, setIsExporting] = useState(false)

  async function exportCsv() {
    setIsExporting(true)

    try {
      await exportTableCsv(convex, organizationId, table)
    } catch (error) {
      showErrorToast(error, "Could not export the table.")
    } finally {
      setIsExporting(false)
    }
  }

  return { exportCsv, isExporting }
}

/** Export a table the caller only knows by id — the list page's bulk
 *  download — by fetching its definition first. */
export async function exportTableById(
  convex: ConvexReactClient,
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const result = await convex.query(api.tables.console.get, {
    organizationId,
    tableId,
  })

  if (result.table === null) {
    throw new Error("Table was not found")
  }

  await exportTableCsv(convex, organizationId, result.table)
}

async function exportTableCsv(
  convex: ConvexReactClient,
  organizationId: string,
  table: TableDetail
) {
  const rows = await fetchAllRows(convex, organizationId, table.tableId)

  downloadTextFile(
    toFilename(table.name, "csv"),
    buildCsvExport(table.columns, rows),
    "text/csv"
  )
}

/** CSV text for the whole table: column names as the header — the same
 *  headers the grid shows — columns in definition order, absent cells
 *  empty. */
export function buildCsvExport(
  columns: TableColumn[],
  rows: { values: Record<string, unknown> }[]
) {
  return serializeCsv([
    columns.map((column) => column.name),
    ...rows.map((row) =>
      columns.map((column) => {
        const value = row.values[column.id]

        return value === undefined ? "" : String(value)
      })
    ),
  ])
}

async function fetchAllRows(
  convex: ConvexReactClient,
  organizationId: string,
  tableId: GenericId<"collections">
) {
  const rows: TableRow[] = []
  let cursor: string | null = null

  for (;;) {
    const page: TableRowPage = await convex.query(api.tables.console.pageRows, {
      organizationId,
      tableId,
      paginationOpts: { numItems: exportPageSize, cursor },
    })

    rows.push(...page.page)

    if (page.isDone) {
      return rows
    }

    cursor = page.continueCursor
  }
}
