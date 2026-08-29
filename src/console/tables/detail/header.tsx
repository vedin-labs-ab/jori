import { Download, Link2, Loader2, Pencil, Plus } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"
import { MaterialActions } from "../../shared/materials/actions"
import { tableDeleteDescription, type useTableRemoval } from "../manage"
import { type TableDetail } from "../types"

export function TableHeaderActions({
  isArchived,
  isExporting,
  onAdd,
  onDelete,
  onEdit,
  onExport,
  onMoveToFolder,
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
  onMoveToFolder: () => void
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
        onMoveToFolder={onMoveToFolder}
        onRestore={() => void removal.restoreTable(table)}
      />
    </ConsoleHeaderActions>
  )
}
