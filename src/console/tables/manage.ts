import { useConvex, useMutation } from "convex/react"
import { countNoun } from "@/shared/console/count"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "@/shared/console/materials/removal"
import { tableNoun } from "@/shared/console/tables/list/config"
import { type TableSummary } from "@/shared/console/tables/types"
import { api } from "../../../convex/_generated/api"
import { exportTableById } from "./detail/export"

type TableTarget = Pick<TableSummary, "tableId" | "name" | "archivedAt">

export function useTableRemoval(organizationId: string) {
  const remove = useMutation(api.tables.console.remove)
  const restore = useMutation(api.tables.console.restore)
  return useMaterialRemoval<TableTarget>({
    identify: (table) => table.tableId,
    noun: "table",
    remove: (table) => remove({ organizationId, tableId: table.tableId }),
    restore: (table) => restore({ organizationId, tableId: table.tableId }),
  })
}

/** The selection bar's actions: each removes or exports per selected row,
 *  through the same mutations and exporter the row-level actions use. */
export function useTableBulk(
  organizationId: string,
  selection: RowSelection<TableSummary>
) {
  const convex = useConvex()
  const remove = useMutation(api.tables.console.remove)
  const runner = useBulkRunner()

  function removeSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) => remove({ organizationId, tableId: row.tableId }),
      {
        noun: tableNoun.plural,
        success: bulkMaterialRemovalSuccess(rows, tableNoun),
        verb: "remove",
      }
    )
  }

  function downloadSelected() {
    const rows = selection.selected

    void runner.run(
      rows,
      (row) => exportTableById(convex, organizationId, row.tableId),
      {
        intervalMs: 300,
        noun: tableNoun.plural,
        success: `Downloaded ${countNoun(rows.length, tableNoun)}.`,
        verb: "download",
      }
    )
  }

  return { downloadSelected, isBusy: runner.isBusy, removeSelected }
}
