import {
  Archive,
  Download,
  FolderInput,
  Link2,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"
import { ConfirmRemoveDialog } from "../../shared/materials/actions"
import { tableDeleteDescription, type useTableRemoval } from "../manage"
import { type TableDetail } from "../types"

/** The header keeps only the primary actions; everything about the table
 *  itself hangs off its name in the breadcrumb. */
export function TableHeaderActions({
  isExporting,
  onExport,
  onShare,
}: {
  isExporting: boolean
  onExport: () => void
  onShare: () => void
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
    </ConsoleHeaderActions>
  )
}

/** The table's own menu, hanging off its breadcrumb name: edit, file, and
 *  the archive/restore/delete lifecycle with the shared confirm step. */
export function TableTitleMenu({
  onDelete,
  onEdit,
  onMoveToFolder,
  removal,
  table,
}: {
  onDelete: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  removal: ReturnType<typeof useTableRemoval>
  table: TableDetail
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const isArchived = table.archivedAt !== undefined
  const isPending =
    removal.removingTableId === table.tableId ||
    removal.restoringTableId === table.tableId

  return (
    <>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem disabled={isPending} onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onSelect={onMoveToFolder}>
          <FolderInput />
          Move to folder…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isArchived ? (
          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => void removal.restoreTable(table)}
          >
            <RotateCcw />
            Restore
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => setIsConfirmOpen(true)}
          variant={isArchived ? "destructive" : undefined}
        >
          {isArchived ? <Trash2 /> : <Archive />}
          {isArchived ? "Delete" : "Archive"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmRemoveDialog
        deleteDescription={tableDeleteDescription}
        isArchived={isArchived}
        isDeleting={removal.removingTableId === table.tableId}
        material={{ name: table.name, archivedAt: table.archivedAt }}
        noun="table"
        onDelete={onDelete}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
      />
    </>
  )
}
