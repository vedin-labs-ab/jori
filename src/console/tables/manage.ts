import { useConvex, useMutation } from "convex/react"
import { countNoun } from "@/shared/console/count"
import { useBulkRunner } from "@/shared/console/list/bulk"
import { type ListConfig } from "@/shared/console/list/controls"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  type FolderNames,
  folderFacet,
} from "@/shared/console/materials/folders"
import { ownerFacet } from "@/shared/console/materials/owners"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "@/shared/console/materials/removal"
import { api } from "../../../convex/_generated/api"
import { exportTableById } from "./detail/export"
import { type TableSummary } from "./types"

type TableTarget = Pick<TableSummary, "tableId" | "name" | "archivedAt">

export const tableNoun = { plural: "tables", singular: "table" }

/** What the table list headers sort and filter: the shared material facets
 *  plus this page's name, count, and time sorts. Owner options come from
 *  the listed rows themselves. */
export function tableListConfig(
  folders: FolderNames | undefined,
  tables: readonly TableSummary[]
): ListConfig<TableSummary> {
  return {
    facets: {
      folder: folderFacet(folders),
      owner: ownerFacet(tables),
    },
    sorts: {
      columns: (table) => table.columns.length,
      created: (table) => table.createdAt,
      name: (table) => table.name,
      rows: (table) => table.rowCount,
      updated: (table) => table.updatedAt,
    },
  }
}

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

export const tableDeleteDescription =
  "This permanently deletes the table and every row in it. Anything that reads it loses access."
