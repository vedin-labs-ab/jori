import { ChevronDown, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConsoleListTable } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import {
  type RowSelection,
  selectionHeadState,
} from "../../shared/list/selection"
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
  // the tr (invisible under border-separate) onto the cells. w-auto keeps
  // the grid exactly as wide as its columns — hairlines end where the data
  // ends — and the centered fixed gutter opts out of the frame's
  // first-column page padding.
  return (
    <ConsoleListTable className="w-auto border-separate border-spacing-0 [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_td:not(:last-child)]:border-r [&_td]:border-b [&_th:first-child]:pl-0 [&_th:last-child]:pr-0 [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:shadow-none md:[&_td:first-child]:pl-0 md:[&_td:last-child]:pr-0 md:[&_th:first-child]:pl-0 md:[&_th:last-child]:pr-0">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 min-w-12 p-0 text-center">
            {disabled ? (
              <span className="sr-only">Row number</span>
            ) : (
              <Checkbox
                aria-label="Select all rows"
                checked={selectionHeadState(selection)}
                className="mx-auto"
                onCheckedChange={selection.toggleAll}
              />
            )}
          </TableHead>
          {columns.map((column) => (
            <HeadCell
              column={column}
              key={column.key}
              onInspect={() => onInspectColumn(column)}
            />
          ))}
          <TableHead className="p-0">
            <button
              className="flex h-10 w-fit items-center gap-1.5 whitespace-nowrap px-3 font-normal text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground disabled:opacity-50"
              disabled={disabled}
              onClick={onAddColumn}
              type="button"
            >
              <Plus aria-hidden className="size-3.5" />
              New column
            </button>
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
      className="min-w-56 p-0"
      title={`${column.type}${isRequired ? " · required" : ""}`}
    >
      <button
        aria-label={`${name} column details`}
        className="group/head flex h-10 w-full items-center gap-1.5 px-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
        onClick={onInspect}
        type="button"
      >
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-56 truncate">{name}</span>
        {isRequired ? <span className="text-muted-foreground">*</span> : null}
        {/* Hover suffix: the header opens the column's details, and the
            chevron is the "something opens here" cue. */}
        <ChevronDown
          aria-hidden
          className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/head:opacity-100 group-focus-visible/head:opacity-100"
        />
      </button>
    </TableHead>
  )
}
