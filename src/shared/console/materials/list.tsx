import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { type CountedNoun } from "../count"
import { CreatedItemRow } from "../edit/row"
import { type EditKind, useCreatedItem } from "../edit/state"
import { type DragPayload, type ResourceDragItem } from "../folders/drag/plan"
import { DraggableTableRow } from "../folders/drag/row"
import { useResourceRowDrag } from "../folders/drag/state"
import { SelectionHeadCell, SelectionRowCell } from "../list/bar"
import {
  type ColumnTier,
  columnTier,
  facetEntries,
  type ListConfig,
  type ListControls,
} from "../list/controls"
import { ConsoleListEmpty, FilterableEmptyState } from "../list/empty"
import { ConsoleListContent, ConsoleListTable } from "../list/frame"
import { FilterHead, SortHead } from "../list/head"
import { type RowSelection } from "../list/selection"
import { useNow } from "../time"
import { type FolderNames } from "./folders"

// The list a file, table, store, or job page shows: a selection column, the
// name, whatever columns the kind declares, and the row's menu, with the
// facets and sorts riding the column heads and the empty state's offer
// telling one kind's list from another's. Every row drags onto a folder;
// a selected row takes the rest of the selection with it.

export type MaterialListRow = { name: string }

/** What a cell may read besides its row: the organization's folder names,
 *  and the clock relative times are told against. */
export type MaterialCellContext = {
  folders: FolderNames | undefined
  now: number
}

/** One column between Name and the menu. Its head sorts the list, opens
 *  the named facets, or — left plain — only labels the column. The tier
 *  says how wide the list must be before the column earns its place. */
export type MaterialColumn<Row> = {
  cell: (row: Row, context: MaterialCellContext) => ReactNode
  className?: string
  head?: { facets: readonly string[] } | { sortKey: string }
  label: string
  tier: ColumnTier
  title?: (row: Row) => string
}

/** What tells one material list from another. */
export type MaterialListKind<Row> = {
  /** What the empty state offers: the page's create actions. */
  creationKind?: Exclude<EditKind, "folder">
  action: ReactNode
  columns: readonly MaterialColumn<Row>[]
  description: string
  /** The row as a drag carries it. */
  drag: (row: Row) => ResourceDragItem
  icon: LucideIcon
  identify: (row: Row) => string
  /** The row's menu, trigger and all. */
  menu: (row: Row) => ReactNode
  nameCell: (row: Row) => ReactNode
  noun: CountedNoun
}

type MaterialListProps<Row> = {
  config: ListConfig<Row>
  controls: ListControls
  folders: FolderNames | undefined
  hasFilters: boolean
  kind: MaterialListKind<Row>
  rows: Row[]
  selection: RowSelection<Row>
  unauthorizedMessage: string | undefined
}

export function MaterialList<Row extends MaterialListRow>(
  props: MaterialListProps<Row>
) {
  const { config, controls, hasFilters, kind, rows, selection } = props
  const created = useCreatedItem(kind.creationKind ?? "title")
  const visible = created
    ? rows.filter((row) => kind.identify(row) !== created.item.id)
    : rows
  const selected: DragPayload = {
    folders: [],
    resources: selection.selected.map(kind.drag),
  }

  if (props.unauthorizedMessage !== undefined) {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load {kind.noun.plural}</AlertTitle>
          <AlertDescription>{props.unauthorizedMessage}</AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (rows.length === 0 && !hasFilters && !created) {
    return (
      <ConsoleListEmpty>
        <MaterialEmptyState hasFilters={false} kind={kind} />
      </ConsoleListEmpty>
    )
  }

  return (
    <>
      <ConsoleListTable fill={rows.length > 0 || !!created}>
        <MaterialListHead
          columns={kind.columns}
          config={config}
          controls={controls}
          selection={selection}
        />
        <TableBody>
          {created ? (
            <CreatedItemRow edit={created} colSpan={kind.columns.length + 3} />
          ) : null}
          {visible.map((row) => (
            <MaterialListRow
              key={kind.identify(row)}
              row={row}
              selected={selected}
              {...props}
            />
          ))}
        </TableBody>
      </ConsoleListTable>
      {rows.length === 0 && !created ? (
        <ConsoleListEmpty>
          <MaterialEmptyState hasFilters kind={kind} />
        </ConsoleListEmpty>
      ) : null}
    </>
  )
}

/** The header row is the page's control surface: the name always sorts,
 *  and every other column does what its head declares. */
function MaterialListHead<Row>({
  columns,
  config,
  controls,
  selection,
}: {
  columns: readonly MaterialColumn<Row>[]
  config: ListConfig<Row>
  controls: ListControls
  selection: RowSelection<Row>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead controls={controls} label="Name" sortKey="name" />
        {columns.map((column) => (
          <ColumnHead
            column={column}
            config={config}
            controls={controls}
            key={column.label}
          />
        ))}
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  )
}

function ColumnHead<Row>({
  column,
  config,
  controls,
}: {
  column: MaterialColumn<Row>
  config: ListConfig<Row>
  controls: ListControls
}) {
  const className = columnTier[column.tier]

  if (column.head === undefined) {
    return <TableHead className={className}>{column.label}</TableHead>
  }

  if ("sortKey" in column.head) {
    return (
      <SortHead
        className={className}
        controls={controls}
        label={column.label}
        sortKey={column.head.sortKey}
      />
    )
  }

  return (
    <FilterHead
      className={className}
      controls={controls}
      facets={facetEntries(config, column.head.facets)}
      label={column.label}
    />
  )
}

function MaterialEmptyState<Row>({
  hasFilters,
  kind,
}: {
  hasFilters: boolean
  kind: MaterialListKind<Row>
}) {
  return (
    <FilterableEmptyState
      action={kind.action}
      description={kind.description}
      hasFilters={hasFilters}
      icon={kind.icon}
      noun={kind.noun.plural}
    />
  )
}

function MaterialListRow<Row extends MaterialListRow>({
  folders,
  kind,
  row,
  selected,
  selection,
}: MaterialListProps<Row> & {
  row: Row
  selected: DragPayload
}) {
  const drag = useResourceRowDrag(kind.drag(row), selected)
  const now = useNow(30_000)
  const context = { folders, now }

  return (
    <DraggableTableRow
      data-state={selection.isSelected(row) ? "selected" : undefined}
      drag={drag}
    >
      <SelectionRowCell
        label={`Select ${row.name}`}
        row={row}
        selection={selection}
      />
      <TableCell data-row-link>{kind.nameCell(row)}</TableCell>
      {kind.columns.map((column) => (
        <TableCell
          className={cn(column.className, columnTier[column.tier])}
          key={column.label}
          title={column.title?.(row)}
        >
          {column.cell(row, context)}
        </TableCell>
      ))}
      <TableCell className="text-right">{kind.menu(row)}</TableCell>
    </DraggableTableRow>
  )
}
