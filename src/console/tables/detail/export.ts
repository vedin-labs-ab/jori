import { type ConvexReactClient, useConvex } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { serializeCsv } from "@/lib/csv"
import { downloadTextFile, toFilename } from "@/lib/download"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
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
      const rows = await fetchAllRows(convex, organizationId, table.tableId)

      downloadTextFile(
        toFilename(table.name, "csv"),
        buildCsvExport(table.columns, rows),
        "text/csv"
      )
    } catch (error) {
      showErrorToast(error, "Could not export the table.")
    } finally {
      setIsExporting(false)
    }
  }

  return { exportCsv, isExporting }
}

/** CSV text for the whole table: column keys as the header, columns in
 *  definition order, absent cells empty. */
export function buildCsvExport(
  columns: TableColumn[],
  rows: { values: Record<string, unknown> }[]
) {
  return serializeCsv([
    columns.map((column) => column.key),
    ...rows.map((row) =>
      columns.map((column) => {
        const value = row.values[column.key]

        return value === undefined ? "" : String(value)
      })
    ),
  ])
}

async function fetchAllRows(
  convex: ConvexReactClient,
  organizationId: string,
  tableId: GenericId<"tables">
) {
  const rows: TableRow[] = []
  let cursor: string | null = null

  for (;;) {
    const page: TableRowPage = await convex.query(api.tables.console.pageRows, {
      organizationId,
      tableId,
      paginationOpts: { numItems: exportPageSize, cursor },
    })

    rows.push(...page.rows)

    if (page.isDone) {
      return rows
    }

    cursor = page.continueCursor
  }
}
