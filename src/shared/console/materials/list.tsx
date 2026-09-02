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
import { type CountedNoun } from "../count"
import { SelectionHeadCell, SelectionRowCell } from "../list/bar"
import {
  facetEntries,
  type ListConfig,
  type ListControls,
} from "../list/controls"
import { EmptyRow, FilterableEmptyState } from "../list/empty"
import { ConsoleListContent, ConsoleListTable } from "../list/frame"
import { FilterHead, SortHead } from "../list/head"
import { type RowSelection } from "../list/selection"
import { absoluteTime, relativeTime, useNow } from "../time"
import { MaterialRowMenu } from "./actions/menu"
import { MaterialFolderCell } from "./cells/folder"
import { MaterialOwnerCell } from "./cells/owner"
import { type FolderNames } from "./folders"
import { summaryOwner } from "./owners"
import { type MaterialRemoval } from "./removal"

// The list a table or a store page shows: the same eight columns, facets,
// empty states, and row menu for every material, with the two measured
// columns between Name and Folder and the empty state's offer telling one
// material's list from another's.

export type MaterialListRow = {
  archivedAt?: number
  createdAt: number
  folderId?: string
  name: string
  ownerImage?: string
  ownerName?: string
  updatedAt: number
}

type MaterialMeasure<Row> = {
  cell: (row: Row) => ReactNode
  label: string
  sortKey: string
}

/** What tells one material list from another. */
export type MaterialListKind<Row> = {
  /** What the empty state offers: the page's create actions. */
  action: ReactNode
  deleteDescription: string
  description: string
  icon: LucideIcon
  identify: (row: Row) => string
  measures: [MaterialMeasure<Row>, MaterialMeasure<Row>]
  nameCell: (row: Row) => ReactNode
  noun: CountedNoun
}

type MaterialListProps<Row> = {
  config: ListConfig<Row>
  controls: ListControls
  folders: FolderNames | undefined
  hasFilters: boolean
  kind: MaterialListKind<Row>
  onAccess: (row: Row) => void
  onEdit: (row: Row) => void
  onMoveToFolder: (row: Row) => void
  removal: MaterialRemoval<Row>
  rows: Row[]
  selection: RowSelection<Row>
  unauthorizedMessage: string | undefined
}

export function MaterialList<Row extends MaterialListRow>(
  props: MaterialListProps<Row>
) {
  const { config, controls, hasFilters, kind, rows, selection } = props

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

  if (rows.length === 0 && !hasFilters) {
    return (
      <ConsoleListContent>
        <MaterialEmptyState hasFilters={false} kind={kind} />
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <MaterialListHead
        config={config}
        controls={controls}
        measures={kind.measures}
        selection={selection}
      />
      <TableBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={9}>
            <MaterialEmptyState hasFilters kind={kind} />
          </EmptyRow>
        ) : (
          rows.map((row) => (
            <MaterialListRow key={kind.identify(row)} row={row} {...props} />
          ))
        )}
      </TableBody>
    </ConsoleListTable>
  )
}

/** The header row is the page's control surface: material facets ride the
 *  Folder and Owner columns, every measurable column sorts. */
function MaterialListHead<Row>({
  config,
  controls,
  measures,
  selection,
}: {
  config: ListConfig<Row>
  controls: ListControls
  measures: MaterialListKind<Row>["measures"]
  selection: RowSelection<Row>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead controls={controls} label="Name" sortKey="name" />
        {measures.map((measure) => (
          <SortHead
            controls={controls}
            key={measure.sortKey}
            label={measure.label}
            sortKey={measure.sortKey}
          />
        ))}
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["folder"])}
          label="Folder"
        />
        <SortHead controls={controls} label="Created" sortKey="created" />
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["owner"])}
          label="Owner"
        />
        <SortHead controls={controls} label="Last Updated" sortKey="updated" />
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
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
  onAccess,
  onEdit,
  onMoveToFolder,
  removal,
  row,
  selection,
}: MaterialListProps<Row> & { row: Row }) {
  const now = useNow(30_000)
  const id = kind.identify(row)

  return (
    <TableRow data-state={selection.isSelected(row) ? "selected" : undefined}>
      <SelectionRowCell
        label={`Select ${row.name}`}
        row={row}
        selection={selection}
      />
      <TableCell>{kind.nameCell(row)}</TableCell>
      {kind.measures.map((measure) => (
        <TableCell key={measure.sortKey}>{measure.cell(row)}</TableCell>
      ))}
      <TableCell>
        <MaterialFolderCell folderId={row.folderId} folders={folders} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(row.createdAt)}
      >
        {relativeTime(row.createdAt, now)}
      </TableCell>
      <TableCell>
        <MaterialOwnerCell owner={summaryOwner(row)} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(row.updatedAt)}
      >
        {relativeTime(row.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <MaterialRowMenu
          deleteDescription={kind.deleteDescription}
          isDeleting={removal.removingId === id}
          isRestoring={removal.restoringId === id}
          material={{ name: row.name, archivedAt: row.archivedAt }}
          noun={kind.noun.singular}
          onAccess={() => onAccess(row)}
          onDelete={() => void removal.removeMaterial(row)}
          onEdit={() => onEdit(row)}
          onMoveToFolder={() => onMoveToFolder(row)}
          onRestore={() => void removal.restoreMaterial(row)}
        />
      </TableCell>
    </TableRow>
  )
}
