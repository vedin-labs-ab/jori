import { Link } from "@tanstack/react-router"
import { Columns3, type LucideIcon, Rows3, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/console/shared/count"
import {
  MaterialNameCell,
  materialNameLinkClassName,
} from "../shared/materials/cells/name"
import { MaterialOwnerCell } from "../shared/materials/cells/owner"
import { VisibilityBadge } from "../shared/visibility/badge"
import { type TableSummary } from "./types"

/** Name column: the table icon, a link to the table, and the list's badge
 *  conventions — a visibility badge for anything narrower or wider than
 *  the organization, an archived badge for archived ones. */
export function TableNameCell({ table }: { table: TableSummary }) {
  return (
    <MaterialNameCell icon={Table2}>
      <Link
        className={materialNameLinkClassName}
        params={{ tableId: table.tableId }}
        title={table.name}
        to="/tables/$tableId"
      >
        {table.name}
      </Link>
      {table.visibility.mode === "organization" ? null : (
        <VisibilityBadge visibility={table.visibility} />
      )}
      {table.archivedAt === undefined ? null : (
        <Badge variant="secondary">Archived</Badge>
      )}
    </MaterialNameCell>
  )
}

/** Columns column: a small icon and the count of typed columns. */
export function TableColumnsCell({ table }: { table: TableSummary }) {
  return (
    <CountCell
      count={table.columns.length}
      icon={Columns3}
      label={countLabel(table.columns.length, "column")}
    />
  )
}

/** Rows column: a small icon and the live document count. */
export function TableRowsCell({ table }: { table: TableSummary }) {
  return (
    <CountCell
      count={table.rowCount}
      icon={Rows3}
      label={countLabel(table.rowCount, "row")}
    />
  )
}

/** Owner column: the creating person, or Jori itself when no named owner
 *  resolves — the organization-principal run case. */
export function TableOwnerCell({ table }: { table: TableSummary }) {
  const owner =
    table.ownerName === undefined
      ? ({ kind: "jori" } as const)
      : ({
          kind: "person",
          name: table.ownerName,
          image: table.ownerImage,
        } as const)

  return <MaterialOwnerCell owner={owner} />
}

function CountCell({
  count,
  icon: Icon,
  label,
}: {
  count: number
  icon: LucideIcon
  label: string
}) {
  return (
    <div
      className="flex items-center gap-1.5 text-muted-foreground"
      title={label}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {count}
      <span className="sr-only">{label}</span>
    </div>
  )
}
