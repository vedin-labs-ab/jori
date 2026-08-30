import { Copy, CopyPlus, Pencil, Plus, Trash2 } from "lucide-react"
import { type ReactNode, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { displayCellText } from "@/shared/materials/cells"
import { type RowSelection } from "../../shared/list/selection"
import { type TableColumn, type TableRow as TableRowData } from "../types"
import { type CommitCell, RowCell } from "./cell"

/** One grid row: the number/select gutter and its editable cells, with
 *  the row's actions behind a right-click context menu. */
export function GridRow({
  columns,
  disabled,
  isFresh,
  isPending,
  number,
  onAddRow,
  onCommit,
  onDelete,
  onDuplicate,
  onFreshSettled,
  row,
  selection,
}: {
  columns: TableColumn[]
  disabled: boolean
  isFresh: boolean
  isPending: boolean
  number: number
  onAddRow: () => void
  onCommit: CommitCell
  onDelete: (row: TableRowData) => void
  onDuplicate: (row: TableRowData) => void
  onFreshSettled: () => void
  row: TableRowData
  selection: RowSelection<TableRowData>
}) {
  const spotlightKey = columns.find((column) => column.type !== "boolean")?.key
  const [editKey, setEditKey] = useState<string>()
  const [menuKey, setMenuKey] = useState<string>()

  function settle() {
    setEditKey(undefined)
    onFreshSettled()
  }

  const cells = (
    <TableRow
      className="group/row h-9"
      data-state={selection.isSelected(row) ? "selected" : undefined}
    >
      <GutterCell
        disabled={disabled}
        number={number}
        row={row}
        selection={selection}
      />
      {columns.map((column) => (
        <TableCell
          className="p-0"
          key={column.key}
          onContextMenu={() => setMenuKey(column.key)}
        >
          <RowCell
            column={column}
            disabled={disabled || isPending}
            onCommit={onCommit}
            onSettle={settle}
            row={row}
            spotlight={
              (isFresh && column.key === spotlightKey) || editKey === column.key
            }
          />
        </TableCell>
      ))}
    </TableRow>
  )

  if (disabled) {
    return cells
  }

  return (
    <RowMenu
      isPending={isPending}
      menuColumn={columns.find((column) => column.key === menuKey)}
      onAddRow={onAddRow}
      onDelete={() => onDelete(row)}
      onDuplicate={() => onDuplicate(row)}
      onEditCell={() => setEditKey(menuKey)}
      row={row}
    >
      {cells}
    </RowMenu>
  )
}

/** The row's right-click menu: cell actions for the cell under the
 *  pointer, then row creation and removal. Deleting still confirms. */
function RowMenu({
  children,
  isPending,
  menuColumn,
  onAddRow,
  onDelete,
  onDuplicate,
  onEditCell,
  row,
}: {
  children: ReactNode
  isPending: boolean
  menuColumn: TableColumn | undefined
  onAddRow: () => void
  onDelete: () => void
  onDuplicate: () => void
  onEditCell: () => void
  row: TableRowData
}) {
  const [confirming, setConfirming] = useState(false)
  const editPending = useRef(false)

  function copyCell() {
    if (menuColumn === undefined) {
      return
    }

    void navigator.clipboard
      .writeText(displayCellText(row.values[menuColumn.key]))
      .then(() => toast.success("Cell copied."))
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        {/* Edit cell waits for the menu to finish closing: while the menu's
            focus lock is up it swallows the editor's autofocus, so the
            editor opens from onCloseAutoFocus with the restore prevented
            and the caret lands in the input. */}
        <ContextMenuContent
          className="w-44"
          onCloseAutoFocus={(event) => {
            event.preventDefault()

            if (editPending.current) {
              editPending.current = false
              onEditCell()
            }
          }}
        >
          <ContextMenuItem
            disabled={isPending || menuColumn?.type === "boolean"}
            onSelect={() => {
              editPending.current = true
            }}
          >
            <Pencil />
            Edit cell
          </ContextMenuItem>
          <ContextMenuItem
            disabled={menuColumn === undefined}
            onSelect={copyCell}
          >
            <Copy />
            Copy cell
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onAddRow}>
            <Plus />
            New row
          </ContextMenuItem>
          <ContextMenuItem disabled={isPending} onSelect={onDuplicate}>
            <CopyPlus />
            Duplicate row
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={isPending}
            onSelect={() => setConfirming(true)}
            variant="destructive"
          >
            <Trash2 />
            Delete row
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AlertDialog onOpenChange={setConfirming} open={confirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              The row is removed from the table permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} variant="destructive">
              Delete row
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** The gutter shows the row number until the pointer hovers the row or a
 *  selection is active — then it swaps to the row's checkbox, sim-style. */
function GutterCell({
  disabled,
  number,
  row,
  selection,
}: {
  disabled: boolean
  number: number
  row: TableRowData
  selection: RowSelection<TableRowData>
}) {
  if (disabled) {
    return (
      <TableCell className="select-none p-0 text-center text-muted-foreground tabular-nums">
        {number}
      </TableCell>
    )
  }

  const isActive = selection.count > 0

  return (
    <TableCell className="select-none p-0">
      <span className="flex h-9 items-center justify-center">
        <span
          className={cn(
            "text-muted-foreground tabular-nums",
            isActive ? "hidden" : "group-hover/row:hidden"
          )}
        >
          {number}
        </span>
        <Checkbox
          aria-label={`Select row ${number}`}
          checked={selection.isSelected(row)}
          className={cn(!isActive && "hidden group-hover/row:inline-flex")}
          onCheckedChange={() => selection.toggle(row)}
        />
      </span>
    </TableCell>
  )
}

/** The quiet full-width affordance below the last loaded row; the page
 *  gates instant creation against required columns before it lands here. */
export function NewRowRow({
  disabled,
  onAddRow,
  span,
}: {
  disabled: boolean
  onAddRow: () => void
  span: number
}) {
  if (disabled) {
    return null
  }

  // The affordance fits its content: the button carries its own closing
  // hairlines, and the spanning cell forces all of the grid's cell borders
  // off (the shared [&_td] selectors out-specify plain cell classes).
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="border-0! p-0" colSpan={span}>
        <button
          className="flex h-9 w-fit items-center gap-1.5 whitespace-nowrap border-r border-b px-3 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground"
          onClick={onAddRow}
          type="button"
        >
          <Plus aria-hidden className="size-3.5" />
          New row
        </button>
      </TableCell>
    </TableRow>
  )
}
