import { ChevronDown, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { ConsoleListLoading } from "../../list/loading"
import { type RowSelection, selectionHeadState } from "../../list/selection"
import { columnTypeIcons } from "../draft"
import {
  type RowPlacement,
  type TableColumn,
  type TableRow as TableRowData,
} from "../types"
import { type CommitCell } from "./cell"
import { GridRow } from "./row"
import { useRowWindow } from "./scroll"

/** The table's rows as a full-bleed spreadsheet grid: a number/select
 *  gutter, typed column headers that open their column's details, inline
 *  cell editing, and quiet affordances for a new row below the rows and a
 *  new column past the headers. The grid scrolls endlessly — rows render
 *  windowed over the loaded pages and scrolling loads the rest — so the
 *  New row affordance appears once the bottom of the table is reached.
 *  A table with no columns yet shows the New column affordance as the one
 *  way forward — rows come after columns. */
export function RowGrid({
  columns,
  disabled,
  freshRowId,
  isExhausted,
  isLoading,
  isLoadingMore,
  loadMore,
  onAddColumn,
  onAddRow,
  onCommit,
  onDeleteRow,
  onDuplicateRow,
  onFreshSettled,
  onInsertRow,
  onInspectColumn,
  pendingRowId,
  rows,
  selection,
}: {
  columns: TableColumn[]
  disabled: boolean
  freshRowId: TableRowData["rowId"] | undefined
  isExhausted: boolean
  isLoading: boolean
  isLoadingMore: boolean
  loadMore: () => void
  onAddColumn: () => void
  onAddRow: () => void
  onCommit: CommitCell
  onDeleteRow: (row: TableRowData) => void
  onDuplicateRow: (row: TableRowData) => void
  onFreshSettled: () => void
  onInsertRow: (row: TableRowData, placement: RowPlacement) => void
  onInspectColumn: (column: TableColumn) => void
  pendingRowId: TableRowData["rowId"] | undefined
  rows: TableRowData[]
  selection: RowSelection<TableRowData>
}) {
  const virtual = useRowWindow({
    freshRowId,
    isExhausted,
    isLoadingMore,
    loadMore,
    rows,
  })

  if (isLoading) {
    return <ConsoleListLoading />
  }

  // One scrollport for both axes; the header row sticks to its top and the
  // windowed body below it is a fixed-height canvas the mounted rows place
  // themselves on. Hairlines ride on the cells, so they end exactly where
  // the data ends.
  return (
    <div
      className={cn("relative min-h-0 flex-1 overflow-auto", scrollFade)}
      ref={virtual.scrollRef}
    >
      <div className="w-max text-xs">
        <HeadRow
          columns={columns}
          disabled={disabled}
          onAddColumn={onAddColumn}
          onInspectColumn={onInspectColumn}
          selection={selection}
        />
        <div className="relative" style={{ height: virtual.totalSize }}>
          {virtual.items.map((item) => {
            const row = rows[item.index]

            return row === undefined ? null : (
              <GridRow
                columns={columns}
                disabled={disabled}
                isFresh={freshRowId === row.rowId}
                isPending={pendingRowId === row.rowId}
                key={row.rowId}
                number={item.index + 1}
                onCommit={onCommit}
                onDelete={onDeleteRow}
                onDuplicate={onDuplicateRow}
                onFreshSettled={onFreshSettled}
                onInsert={onInsertRow}
                row={row}
                selection={selection}
                top={item.start}
              />
            )
          })}
        </div>
        <GridFoot
          columns={columns}
          disabled={disabled}
          isExhausted={isExhausted}
          onAddRow={onAddRow}
        />
      </div>
    </div>
  )
}

/** What closes the grid at the bottom: nothing while the table has no
 *  columns (the New column affordance is the one way forward), a quiet
 *  loading band while rows beyond the loaded window remain, or the New
 *  row affordance once the true end of the table is on screen. */
function GridFoot({
  columns,
  disabled,
  isExhausted,
  onAddRow,
}: {
  columns: TableColumn[]
  disabled: boolean
  isExhausted: boolean
  onAddRow: () => void
}) {
  if (columns.length === 0) {
    return null
  }

  if (!isExhausted) {
    return <BandText>Loading more rows…</BandText>
  }

  if (disabled) {
    return null
  }

  return (
    <button
      // Inset ring rather than the bare colour shift this had: a
      // muted-to-foreground change on 12px text is not a focus indicator, and
      // it was indistinguishable from the hover state beside it.
      className="flex h-9 w-fit items-center gap-1.5 whitespace-nowrap border-r border-b px-3 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      onClick={onAddRow}
      type="button"
    >
      <Plus aria-hidden className="size-3.5" />
      New row
    </button>
  )
}

/** A quiet content-width band below the last row, closed off by the same
 *  hairlines the rows carry. */
function BandText({ children }: { children: string }) {
  return (
    <p className="flex h-9 w-fit items-center whitespace-nowrap border-r border-b px-3 text-muted-foreground text-xs">
      {children}
    </p>
  )
}

/** The sticky header row: the select-all gutter, one typed head per
 *  column, and the New column affordance past them. */
function HeadRow({
  columns,
  disabled,
  onAddColumn,
  onInspectColumn,
  selection,
}: {
  columns: TableColumn[]
  disabled: boolean
  onAddColumn: () => void
  onInspectColumn: (column: TableColumn) => void
  selection: RowSelection<TableRowData>
}) {
  // The row declares the height once and the cells stretch into it, the
  // way the data rows do. A cell that sizes itself instead lands its
  // hairline a border-width off from its neighbours'.
  return (
    <div className="sticky top-0 z-10 flex h-10">
      <div className="flex w-12 shrink-0 items-center justify-center border-r border-b bg-background">
        {disabled ? (
          <span className="sr-only">Row number</span>
        ) : (
          <Checkbox
            aria-label="Select all loaded rows"
            checked={selectionHeadState(selection)}
            onCheckedChange={selection.toggleAll}
          />
        )}
      </div>
      {columns.map((column) => (
        <HeadCell
          column={column}
          key={column.id}
          onInspect={() => onInspectColumn(column)}
        />
      ))}
      <div className="border-r border-b bg-background">
        <button
          className="flex h-full w-fit items-center gap-1.5 whitespace-nowrap px-3 font-normal text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50"
          disabled={disabled}
          onClick={onAddColumn}
          type="button"
        >
          <Plus aria-hidden className="size-3.5" />
          New column
        </button>
      </div>
    </div>
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
  const name = column.name

  return (
    <div
      className="w-56 shrink-0 border-r border-b bg-background font-medium"
      title={`${column.type}${isRequired ? " · required" : ""}`}
    >
      <button
        aria-label={`${name} column details`}
        className="group/head flex h-full w-full items-center gap-1.5 px-2 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
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
    </div>
  )
}
