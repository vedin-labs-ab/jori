import { Download, Link2, Loader2, Pencil, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"
import { MaterialActions } from "../../shared/materials/actions"
import { MaterialScopeBadge } from "../../shared/materials/scope"
import { tableDeleteDescription, type useTableRemoval } from "../manage"
import { type TableDetail } from "../types"

export function TableHeaderActions({
  isArchived,
  isExporting,
  onAdd,
  onDelete,
  onEdit,
  onExport,
  onShare,
  removal,
  table,
}: {
  isArchived: boolean
  isExporting: boolean
  onAdd: () => void
  onDelete: () => void
  onEdit: () => void
  onExport: () => void
  onShare: () => void
  removal: ReturnType<typeof useTableRemoval>
  table: TableDetail
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleHeaderButton
        icon={<Link2 />}
        label="Share"
        onClick={onShare}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        disabled={isExporting}
        icon={isExporting ? <Loader2 className="animate-spin" /> : <Download />}
        label="Export"
        onClick={onExport}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        icon={<Pencil />}
        label="Edit table"
        onClick={onEdit}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        disabled={isArchived}
        icon={<Plus />}
        label="Add row"
        onClick={onAdd}
        type="button"
      />
      <MaterialActions
        deleteDescription={tableDeleteDescription}
        isDeleting={removal.removingTableId === table.tableId}
        isRestoring={removal.restoringTableId === table.tableId}
        material={{ name: table.name, archivedAt: table.archivedAt }}
        noun="table"
        onDelete={onDelete}
        onRestore={() => void removal.restoreTable(table)}
      />
    </ConsoleHeaderActions>
  )
}

export function TableHeading({
  isArchived,
  table,
}: {
  isArchived: boolean
  table: TableDetail
}) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium text-lg tracking-tight">{table.name}</h2>
        <MaterialScopeBadge scope={table.scope} />
        {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      {table.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{table.description}</p>
      )}
      {isArchived ? (
        <p className="text-muted-foreground text-xs">
          Archived tables are read-only. Restore the table to change rows.
        </p>
      ) : null}
    </div>
  )
}
