import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useMaterialRemoval } from "../shared/materials/removal"
import { type TableSummary } from "./types"

type TableTarget = Pick<TableSummary, "tableId" | "name" | "archivedAt">

export function useTableRemoval(organizationId: string) {
  const remove = useMutation(api.tables.console.remove)
  const restore = useMutation(api.tables.console.restore)
  const removal = useMaterialRemoval<TableTarget>({
    identify: (table) => table.tableId,
    noun: "table",
    remove: (table) => remove({ organizationId, tableId: table.tableId }),
    restore: (table) => restore({ organizationId, tableId: table.tableId }),
  })

  return {
    removeTable: removal.removeMaterial,
    removingTableId: removal.removingId,
    restoreTable: removal.restoreMaterial,
    restoringTableId: removal.restoringId,
  }
}

export const tableDeleteDescription =
  "This permanently deletes the table and every row in it. Anything that reads it loses access."
