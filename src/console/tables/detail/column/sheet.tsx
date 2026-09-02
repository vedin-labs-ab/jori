import {
  ColumnSheet,
  type ColumnSheetState,
} from "@/shared/console/tables/sheet"
import { type TableDetail } from "@/shared/console/tables/types"
import { useColumnSheet } from "./form"

/** The column sheet bound to the table's schema: its draft, and the one
 *  update that appends, renames, or deletes a column. */
export function TableColumnSheet({
  onOpenChange,
  organizationId,
  state,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  state: ColumnSheetState | undefined
  table: TableDetail
}) {
  const form = useColumnSheet(organizationId, table, state, onOpenChange)

  return (
    <ColumnSheet
      form={form}
      onOpenChange={onOpenChange}
      state={state}
      table={table}
    />
  )
}
