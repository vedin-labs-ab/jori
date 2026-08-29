import { Plus, Trash2 } from "lucide-react"
import { type ReactNode } from "react"
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConsoleListTable } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { columnTypeIcons } from "../draft"
import { type TableColumn, type TableRow as TableRowData } from "../types"
import { type CommitCell, RowCell } from "./cell"

/** The table's rows as a full-bleed spreadsheet grid: a row-number gutter,
 *  typed column headers, inline cell editing, and quiet affordances for a
 *  new row below the rows and a new column past the headers. An empty
 *  table is just the grid without rows. */
export function RowGrid({
  columnAdder,
  columns,
  disabled,
  freshRowId,
  isLoading,
  offset,
  onAddRow,
  onCommit,
  onDeleteRow,
  onFreshSettled,
  pendingRowId,
  rows,
}: {
  columnAdder: ReactNode
  columns: TableColumn[]
  disabled: boolean
  freshRowId: TableRowData["rowId"] | undefined
  isLoading: boolean
  offset: number
  onAddRow: () => void
  onCommit: CommitCell
  onDeleteRow: (row: TableRowData) => void
  onFreshSettled: () => void
  pendingRowId: TableRowData["rowId"] | undefined
  rows: TableRowData[]
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  // Separate borders so the column and header hairlines stay attached to
  // their sticky cells while the grid scrolls; row separators move from
  // the tr (invisible under border-separate) onto the cells.
  return (
    <ConsoleListTable className="border-separate border-spacing-0 [&_tbody_tr:last-child_td]:border-b-0 [&_td:not(:last-child)]:border-r [&_td]:border-b [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:shadow-none">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Row number</span>
          </TableHead>
          {columns.map((column) => (
            <HeadCell column={column} key={column.key} />
          ))}
          <TableHead className="w-10 text-right">{columnAdder}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <GridRow
            columns={columns}
            disabled={disabled}
            isFresh={freshRowId === row.rowId}
            isPending={pendingRowId === row.rowId}
            key={row.rowId}
            number={offset + index + 1}
            onCommit={onCommit}
            onDelete={onDeleteRow}
            onFreshSettled={onFreshSettled}
            row={row}
          />
        ))}
        <NewRowRow
          disabled={disabled}
          onAddRow={onAddRow}
          span={columns.length + 2}
        />
      </TableBody>
    </ConsoleListTable>
  )
}

function HeadCell({ column }: { column: TableColumn }) {
  const Icon = columnTypeIcons[column.type]
  const isRequired = column.required === true

  return (
    <TableHead title={`${column.type}${isRequired ? " · required" : ""}`}>
      <span className="flex items-center gap-1.5">
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-56 truncate">
          {column.name === "" ? column.key : column.name}
        </span>
        {isRequired ? <span className="text-muted-foreground">*</span> : null}
      </span>
    </TableHead>
  )
}

function GridRow({
  columns,
  disabled,
  isFresh,
  isPending,
  number,
  onCommit,
  onDelete,
  onFreshSettled,
  row,
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
}) {
  const spotlightKey = columns.find((column) => column.type !== "boolean")?.key

  return (
    <TableRow className="group/row h-9">
      <TableCell className="select-none py-0 text-muted-foreground tabular-nums">
        {number}
      </TableCell>
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
      <TableCell className="py-0 text-right">
        <DeleteRowButton
          disabled={disabled || isPending}
          onDelete={() => onDelete(row)}
        />
      </TableCell>
    </TableRow>
  )
}

/** The quiet full-width affordance below the last loaded row; the page
 *  gates instant creation against required columns before it lands here. */
function NewRowRow({
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

  return (
    <TableRow>
      <TableCell className="py-0" colSpan={span}>
        <button
          className="flex h-9 w-full items-center gap-1.5 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground"
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
