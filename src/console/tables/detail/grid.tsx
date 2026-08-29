import { Table2, Trash2 } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListLoading } from "../../shared/list/loading"
import { type TableColumn, type TableRow as TableRowData } from "../types"
import { type CommitCell, RowCell } from "./cell"

/** The table's rows under its typed columns, with inline cell editing. */
export function RowGrid({
  columns,
  disabled,
  isLoading,
  onCommit,
  onDeleteRow,
  pendingRowId,
  rows,
}: {
  columns: TableColumn[]
  disabled: boolean
  isLoading: boolean
  onCommit: CommitCell
  onDeleteRow: (row: TableRowData) => void
  pendingRowId: TableRowData["rowId"] | undefined
  rows: TableRowData[]
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  if (rows.length === 0) {
    return (
      <ConsoleEmptyState
        description="Rows Jori and your team add to this table appear here."
        icon={Table2}
        title="No rows yet"
      />
    )
  }

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.name}
                <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                  {column.type}
                  {column.required === true ? " · required" : ""}
                </span>
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <GridRow
              columns={columns}
              disabled={disabled}
              isPending={pendingRowId === row.rowId}
              key={row.rowId}
              onCommit={onCommit}
              onDelete={onDeleteRow}
              row={row}
            />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

function GridRow({
  columns,
  disabled,
  isPending,
  onCommit,
  onDelete,
  row,
}: {
  columns: TableColumn[]
  disabled: boolean
  isPending: boolean
  onCommit: CommitCell
  onDelete: (row: TableRowData) => void
  row: TableRowData
}) {
  return (
    <TableRow>
      {columns.map((column) => (
        <TableCell key={column.key}>
          <RowCell
            column={column}
            disabled={disabled || isPending}
            onCommit={onCommit}
            row={row}
          />
        </TableCell>
      ))}
      <TableCell className="text-right">
        <DeleteRowButton
          disabled={disabled || isPending}
          onDelete={() => onDelete(row)}
        />
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
