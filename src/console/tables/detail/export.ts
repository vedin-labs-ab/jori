import { type ConvexReactClient, useConvex } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { type TableDetail, type TableRow, type TableRowPage } from "../types"
import { buildCsvExport } from "./csv"

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
        `${table.name.replaceAll(/[\\/:]/g, "-")}.csv`,
        buildCsvExport(table.columns, rows)
      )
    } catch (error) {
      showErrorToast(error, "Could not export the table.")
    } finally {
      setIsExporting(false)
    }
  }

  return { exportCsv, isExporting }
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

function downloadTextFile(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }))
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
