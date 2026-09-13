import { Columns3, Rows3, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/shared/console/count"
import { MaterialMeasureCell } from "@/shared/console/materials/cells/measure"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "@/shared/console/materials/cells/name"
import { type TableSummary } from "@/shared/console/tables/types"
import { VisibilityNameMark } from "@/shared/console/visibility/table"
import { ConsoleLink } from "../../shell/link"

/** Name column: the table icon, a link to the table, and the list's badge
 *  conventions — a visibility badge for anything narrower or wider than
 *  the organization, an archived badge for archived ones. */
export function TableNameCell({ table }: { table: TableSummary }) {
  return (
    <MaterialNameCell icon={Table2}>
      <ConsoleLink
        className={materialNameLinkClassName}
        draggable={false}
        params={{ tableId: table.tableId }}
        title={table.name}
        to="/tables/$tableId"
      >
        {table.name}
      </ConsoleLink>
      <VisibilityNameMark {...table} />
      {table.archivedAt === undefined ? null : (
        <Badge variant="secondary">Archived</Badge>
      )}
    </MaterialNameCell>
  )
}

/** Columns column: a small icon and the count of typed columns. */
export function TableColumnsCell({ table }: { table: TableSummary }) {
  return (
    <MaterialMeasureCell
      icon={Columns3}
      label={countLabel(table.columns.length, "column")}
      value={table.columns.length}
    />
  )
}

/** Rows column: a small icon and the live document count. */
export function TableRowsCell({ table }: { table: TableSummary }) {
  return (
    <MaterialMeasureCell
      icon={Rows3}
      label={countLabel(table.rowCount, "row")}
      value={table.rowCount}
    />
  )
}
