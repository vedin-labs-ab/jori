import { Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type RowSelection } from "../../shared/list/selection"
import { type TableColumn, type TableRow as TableRowData } from "../types"
import { type CommitCell, RowCell } from "./cell"

/** One grid row: the number/select gutter, its editable cells, and the
 *  hover-revealed delete action. */
export function GridRow({
  columns,
  disabled,
  isFresh,
  isPending,
  number,
  onCommit,
  onDelete,
  onFreshSettled,
  row,
  selection,
}: {
  columns: TableColumn[]
  disabled: boolean
  isFresh: boolean
  isPending: boolean
  number: number
  onCommit: CommitCell
  onDelete: (row: TableRowData) => void
  onFreshSettled: () => void
  row: TableRowData
  selection: RowSelection<TableRowData>
}) {
  const spotlightKey = columns.find((column) => column.type !== "boolean")?.key

  return (
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
        <TableCell className="py-0" key={column.key}>
          <RowCell
            column={column}
            disabled={disabled || isPending}
            onCommit={onCommit}
            onSettle={onFreshSettled}
            row={row}
            spotlight={isFresh && column.key === spotlightKey}
          />
        </TableCell>
      ))}
      <TableCell className="p-0 text-center">
        <DeleteRowButton
          disabled={disabled || isPending}
          onDelete={() => onDelete(row)}
        />
      </TableCell>
    </TableRow>
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

  // The affordance closes the grid: it spans exactly the grid's width and
  // carries its own bottom and right hairlines (the last-row reset would
  // otherwise strip them).
  return (
    <TableRow>
      <TableCell className="border-r border-b! p-0" colSpan={span}>
        <button
          className="flex h-9 w-full items-center gap-1.5 px-3 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground"
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

function DeleteRowButton({
  disabled,
  onDelete,
}: {
  disabled: boolean
  onDelete: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label="Delete row"
          className="md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100"
          disabled={disabled}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
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
  )
}
