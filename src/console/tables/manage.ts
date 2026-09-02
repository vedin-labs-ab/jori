import { useConvex, useMutation } from "convex/react"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "@/shared/console/materials/removal"
import { tableNoun } from "@/shared/console/tables/list/config"
import { type TableSummary } from "@/shared/console/tables/types"
import { api } from "../../../convex/_generated/api"
import { useMaterialBulk } from "../shared/materials/bulk"
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

export function useTableBulk(
  organizationId: string,
  selection: RowSelection<TableSummary>
) {
  const convex = useConvex()
  const remove = useMutation(api.tables.console.remove)

  return useMaterialBulk({
    download: (table) => exportTableById(convex, organizationId, table.tableId),
    noun: tableNoun,
    remove: (table) => remove({ organizationId, tableId: table.tableId }),
    removal: {
      success: (rows) => bulkMaterialRemovalSuccess(rows, tableNoun),
      verb: "remove",
    },
    selection,
  })
}
