import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SelectionHeadCell } from "../../shared/list/bar"
import { ConsoleListTable } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { type RowSelection } from "../../shared/list/selection"
import { columnTypeIcons } from "../draft"
import { type TableColumn, type TableRow as TableRowData } from "../types"
import { type CommitCell } from "./cell"
import { GridRow, NewRowRow } from "./row"

/** The table's rows as a full-bleed spreadsheet grid: a number/select
 *  gutter, typed column headers that open their column's details, inline
 *  cell editing, and quiet affordances for a new row below the rows and a
 *  new column past the headers. An empty table is just the grid without
 *  rows. */
export function RowGrid({
  columns,
  disabled,
  freshRowId,
  isLoading,
  offset,
  onAddColumn,
  onAddRow,
  onCommit,
  onDeleteRow,
  onFreshSettled,
  onInspectColumn,
  pendingRowId,
  rows,
  selection,
}: {
  columns: TableColumn[]
  disabled: boolean
  freshRowId: TableRowData["rowId"] | undefined
  isLoading: boolean
  offset: number
  onAddColumn: () => void
  onAddRow: () => void
  onCommit: CommitCell
  onDeleteRow: (row: TableRowData) => void
  onFreshSettled: () => void
  onInspectColumn: (column: TableColumn) => void
  pendingRowId: TableRowData["rowId"] | undefined
  rows: TableRowData[]
  selection: RowSelection<TableRowData>
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
          {disabled ? (
            <TableHead className="w-10">
              <span className="sr-only">Row number</span>
            </TableHead>
          ) : (
            <SelectionHeadCell selection={selection} />
          )}
          {columns.map((column) => (
            <HeadCell
              column={column}
              key={column.key}
              onInspect={() => onInspectColumn(column)}
            />
          ))}
          <TableHead className="w-10 text-right">
            <Button
              aria-label="New column"
              disabled={disabled}
              onClick={onAddColumn}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Plus />
            </Button>
          </TableHead>
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
            selection={selection}
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

/** A typed column header; clicking it opens the column's details. */
function HeadCell({
  column,
  onInspect,
}: {
  column: TableColumn
  onInspect: () => void
}) {
  const Icon = columnTypeIcons[column.type]
  const isRequired = column.required === true
  const name = column.name === "" ? column.key : column.name

  return (
    <TableHead
      className="p-0"
      title={`${column.type}${isRequired ? " · required" : ""}`}
    >
      <button
        aria-label={`${name} column details`}
        className="flex h-10 w-full items-center gap-1.5 px-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
        onClick={onInspect}
        type="button"
      >
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-56 truncate">{name}</span>
        {isRequired ? <span className="text-muted-foreground">*</span> : null}
      </button>
    </TableHead>
  )
}
