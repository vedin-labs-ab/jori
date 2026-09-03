import { useMutation } from "convex/react"
import { EditMaterialDialog } from "@/shared/console/materials/dialogs/edit"
import { tableEditBlurb } from "@/shared/console/tables/list/config"
import { type TableDetail } from "@/shared/console/tables/types"
import { api } from "../../../convex/_generated/api"
import { useMaterialUpdate } from "../shared/materials/update"

/** All an edit needs of a table; its summary and its detail both fit. */
type EditableTable = Pick<TableDetail, "name" | "tableId">

/** Rename the table. Columns live in the grid itself — the
 *  New column header cell and each column's details sheet. */
export function EditTableDialog({
  onOpenChange,
  organizationId,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  table: EditableTable | undefined
}) {
  const update = useMutation(api.tables.console.update)
  const edit = useMaterialUpdate(
    "table",
    (values) =>
      table === undefined
        ? Promise.resolve()
        : update({ organizationId, tableId: table.tableId, ...values }),
    () => onOpenChange(false)
  )

  return (
    <EditMaterialDialog
      blurb={tableEditBlurb}
      isSaving={edit.isSaving}
      material={table}
      noun="table"
      onOpenChange={onOpenChange}
      onSave={edit.save}
    />
  )
}
