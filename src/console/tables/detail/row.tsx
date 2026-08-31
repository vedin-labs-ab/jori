import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  Copy,
  CopyPlus,
  Pencil,
  Trash2,
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import { displayCellText } from "@/shared/cell"
import { type RowSelection } from "../../shared/list/selection"
import {
  type RowPlacement,
  type TableColumn,
  type TableRow as TableRowData,
} from "../types"
import { type CommitCell, RowCell } from "./cell"
import { parseCellText } from "./cells"

/** One grid row: the number/select gutter and its editable cells, with
 *  the row's actions behind a right-click context menu. Rows render inside
 *  the grid's virtual window, so each places itself on the body canvas at
 *  the offset its index dictates. */
export function GridRow({
  columns,
  disabled,
  isFresh,
  isPending,
  number,
  onCommit,
  onDelete,
  onDuplicate,
  onFreshSettled,
  onInsert,
  row,
  selection,
  top,
}: {
  columns: TableColumn[]
  disabled: boolean
  isFresh: boolean
  isPending: boolean
  number: number
  onCommit: CommitCell
  onDelete: (row: TableRowData) => void
  onDuplicate: (row: TableRowData) => void
  onFreshSettled: () => void
  onInsert: (row: TableRowData, placement: RowPlacement) => void
  row: TableRowData
  selection: RowSelection<TableRowData>
  top: number
}) {
  const spotlightId = columns.find((column) => column.type !== "boolean")?.id
  const [editId, setEditId] = useState<string>()
  const [menuId, setMenuId] = useState<string>()

  function settle() {
    setEditId(undefined)
    onFreshSettled()
  }

  function advance(fromId: string, direction: 1 | -1) {
    setEditId(nextEditId(columns, fromId, direction))
  }

  const cells = (
    <div
      className="group/row absolute top-0 left-0 flex h-9 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
      data-state={selection.isSelected(row) ? "selected" : undefined}
      style={{ transform: `translateY(${top}px)` }}
    >
      <GutterCell
        disabled={disabled}
        number={number}
        row={row}
        selection={selection}
      />
      {columns.map((column) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: only remembers which cell the row's context menu targets — the menu itself stays the accessible path.
        <div
          className="w-56 shrink-0 border-r border-b"
          key={column.id}
          onContextMenu={() => setMenuId(column.id)}
        >
          <RowCell
            column={column}
            disabled={disabled || isPending}
            onAdvance={(direction) => advance(column.id, direction)}
            onCommit={onCommit}
            onSettle={settle}
            row={row}
            spotlight={
              (isFresh && column.id === spotlightId) || editId === column.id
            }
          />
        </div>
      ))}
    </div>
  )

  if (disabled) {
    return cells
  }

  return (
    <RowMenu
      isPending={isPending}
      menuColumn={columns.find((column) => column.id === menuId)}
      onDelete={() => onDelete(row)}
      onDuplicate={() => onDuplicate(row)}
      onEditCell={() => setEditId(menuId)}
      onInsert={(placement) => onInsert(row, placement)}
      onPasteCell={(column, text) => pasteIntoCell(onCommit, row, column, text)}
      row={row}
    >
      {cells}
    </RowMenu>
  )
}

/** Pasted text lands like a typed edit: parsed for the column, committed
 *  when it fits, and toasted when it does not. */
function pasteIntoCell(
  onCommit: CommitCell,
  row: TableRowData,
  column: TableColumn,
  text: string
) {
  const parsed = parseCellText(column, text)

  if (parsed.ok) {
    void onCommit(row, column.id, parsed.value)
  } else {
    toast.error(parsed.error)
  }
}

/** Tab from a committed editor moves editing to the row's neighboring
 *  text-like cell; past either end it returns undefined and the editor
 *  stays closed. Runs after the closing cell's settle, so the later
 *  setEditId wins the batch. */
function nextEditId(columns: TableColumn[], fromId: string, direction: 1 | -1) {
  const textColumns = columns.filter((column) => column.type !== "boolean")
  const from = textColumns.findIndex((column) => column.id === fromId)

  return textColumns[from + direction]?.id
}

/** The row's right-click menu: cell actions for the cell under the
 *  pointer, then row creation anchored to this row, and removal. Deleting
 *  still confirms. */
function RowMenu({
  children,
  isPending,
  menuColumn,
  onDelete,
  onDuplicate,
  onEditCell,
  onInsert,
  onPasteCell,
  row,
}: {
  children: ReactNode
  isPending: boolean
  menuColumn: TableColumn | undefined
  onDelete: () => void
  onDuplicate: () => void
  onEditCell: () => void
  onInsert: (placement: RowPlacement) => void
  onPasteCell: (column: TableColumn, text: string) => void
  row: TableRowData
}) {
  const [confirming, setConfirming] = useState(false)
  const editPending = useRef(false)

  function copyCell() {
    if (menuColumn === undefined) {
      return
    }

    void navigator.clipboard
      .writeText(displayCellText(row.values[menuColumn.id]))
      .then(() => toast.success("Cell copied."))
  }

  async function pasteCell() {
    if (menuColumn === undefined) {
      return
    }

    const text = await navigator.clipboard.readText().catch(() => null)

    if (text === null) {
      toast.error("Couldn't read the clipboard.")

      return
    }

    onPasteCell(menuColumn, text)
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
          <ContextMenuItem
            disabled={isPending || menuColumn?.type === "boolean"}
            onSelect={() => void pasteCell()}
          >
            <Clipboard />
            Paste
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => onInsert("above")}>
            <ArrowUp />
            Insert row above
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onInsert("below")}>
            <ArrowDown />
            Insert row below
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
      <div className="flex h-9 w-12 shrink-0 select-none items-center justify-center border-r border-b text-muted-foreground tabular-nums">
        {number}
      </div>
    )
  }

  const isActive = selection.count > 0

  return (
    <div className="flex h-9 w-12 shrink-0 select-none items-center justify-center border-r border-b">
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
    </div>
  )
}
