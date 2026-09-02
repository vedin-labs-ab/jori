import { useMutation } from "convex/react"
import { useColumnSheetForm } from "@/shared/console/tables/column"
import {
  type ColumnSheetForm,
  type ColumnSheetState,
} from "@/shared/console/tables/sheet"
import { type TableDetail } from "@/shared/console/tables/types"
import { api } from "../../../../../convex/_generated/api"

/** The column sheet's form bound to the table's schema: one update of
 *  every column, through the table mutation. */
export function useColumnSheet(
  organizationId: string,
  table: TableDetail,
  state: ColumnSheetState | undefined,
  onOpenChange: (isOpen: boolean) => void
): ColumnSheetForm {
  const updateTable = useMutation(api.tables.console.update)

  return useColumnSheetForm({
    onOpenChange,
    onSave: (columns) =>
      updateTable({ organizationId, tableId: table.tableId, columns }),
    state,
    table,
  })
}
