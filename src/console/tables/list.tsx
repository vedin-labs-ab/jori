import { Plus, Table2, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "../shared/layout"
import { SelectionHeadCell, SelectionRowCell } from "../shared/list/bar"
import {
  facetEntries,
  type ListConfig,
  type ListControls,
} from "../shared/list/controls"
import { EmptyRow, FilterableEmptyState } from "../shared/list/empty"
import { ConsoleListContent, ConsoleListTable } from "../shared/list/frame"
import { FilterHead, SortHead } from "../shared/list/head"
import { type RowSelection } from "../shared/list/selection"
import { MaterialRowMenu } from "../shared/materials/actions/menu"
import { MaterialFolderCell } from "../shared/materials/cells/folder"
import { type FolderNames } from "../shared/materials/folders"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import {
  TableColumnsCell,
  TableNameCell,
  TableOwnerCell,
  TableRowsCell,
} from "./cells"
import { tableDeleteDescription, type useTableRemoval } from "./manage"
import { type TableSummary } from "./types"

export function TablesToolbar({
  onCreate,
  onImport,
  onQueryChange,
  query,
}: {
  onCreate: () => void
  onImport: () => void
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleSearch
        label="Search tables"
        onValueChange={onQueryChange}
        value={query}
      />
      <ConsoleHeaderButton
        icon={<Upload />}
        label="Import"
        onClick={onImport}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        icon={<Plus />}
        label="New table"
        onClick={onCreate}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

export function TableList({
  config,
  controls,
  folders,
  hasFilters,
  onAccess,
  onCreate,
  onEdit,
  onImport,
  onMoveToFolder,
  removal,
  selection,
  tables,
  unauthorizedMessage,
}: {
  config: ListConfig<TableSummary>
  controls: ListControls
  folders: FolderNames | undefined
  hasFilters: boolean
  onAccess: (table: TableSummary) => void
  onCreate: () => void
  onEdit: (table: TableSummary) => void
  onImport: () => void
  onMoveToFolder: (table: TableSummary) => void
  removal: ReturnType<typeof useTableRemoval>
  selection: RowSelection<TableSummary>
  tables: TableSummary[]
  unauthorizedMessage: string | undefined
}) {
  if (unauthorizedMessage !== undefined) {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load tables</AlertTitle>
          <AlertDescription>{unauthorizedMessage}</AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (tables.length === 0 && !hasFilters) {
    return (
      <ConsoleListContent>
        <TablesEmptyState
          hasFilters={false}
          onCreate={onCreate}
          onImport={onImport}
        />
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <TableListHead
        config={config}
        controls={controls}
        selection={selection}
      />
      <TableBody>
        {tables.length === 0 ? (
          <EmptyRow colSpan={9}>
            <TablesEmptyState
              hasFilters
              onCreate={onCreate}
              onImport={onImport}
            />
          </EmptyRow>
        ) : (
          tables.map((table) => (
            <TableListRow
              folders={folders}
              key={table.tableId}
              onAccess={onAccess}
              onEdit={onEdit}
              onMoveToFolder={onMoveToFolder}
              removal={removal}
              selection={selection}
              table={table}
            />
          ))
        )}
      </TableBody>
    </ConsoleListTable>
  )
}

/** The header row is the page's control surface: material facets ride the
 *  Name and Folder columns, every measurable column sorts. */
function TableListHead({
  config,
  controls,
  selection,
}: {
  config: ListConfig<TableSummary>
  controls: ListControls
  selection: RowSelection<TableSummary>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead controls={controls} label="Name" sortKey="name" />
        <SortHead controls={controls} label="Columns" sortKey="columns" />
        <SortHead controls={controls} label="Rows" sortKey="rows" />
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

function TablesEmptyState({
  hasFilters,
  onCreate,
  onImport,
}: {
  hasFilters: boolean
  onCreate: () => void
  onImport: () => void
}) {
  return (
    <FilterableEmptyState
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onCreate} type="button">
            <Plus />
            New table
          </Button>
          <Button onClick={onImport} type="button" variant="outline">
            <Upload />
            Import
          </Button>
        </div>
      }
      description="Typed tables Jori and your team keep structured records in appear here."
      hasFilters={hasFilters}
      icon={Table2}
      noun="tables"
    />
  )
}

function TableListRow({
  folders,
  onAccess,
  onEdit,
  onMoveToFolder,
  removal,
  selection,
  table,
}: {
  folders: FolderNames | undefined
  onAccess: (table: TableSummary) => void
  onEdit: (table: TableSummary) => void
  onMoveToFolder: (table: TableSummary) => void
  removal: ReturnType<typeof useTableRemoval>
  selection: RowSelection<TableSummary>
  table: TableSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow data-state={selection.isSelected(table) ? "selected" : undefined}>
      <SelectionRowCell
        label={`Select ${table.name}`}
        row={table}
        selection={selection}
      />
      <TableCell>
        <TableNameCell table={table} />
      </TableCell>
      <TableCell>
        <TableColumnsCell table={table} />
      </TableCell>
      <TableCell>
        <TableRowsCell table={table} />
      </TableCell>
      <TableCell>
        <MaterialFolderCell folderId={table.folderId} folders={folders} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(table.createdAt)}
      >
        {relativeTime(table.createdAt, now)}
      </TableCell>
      <TableCell>
        <TableOwnerCell table={table} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(table.updatedAt)}
      >
        {relativeTime(table.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <MaterialRowMenu
          deleteDescription={tableDeleteDescription}
          isDeleting={removal.removingId === table.tableId}
          isRestoring={removal.restoringId === table.tableId}
          material={{ name: table.name, archivedAt: table.archivedAt }}
          noun="table"
          onAccess={() => onAccess(table)}
          onDelete={() => void removal.removeMaterial(table)}
          onEdit={() => onEdit(table)}
          onMoveToFolder={() => onMoveToFolder(table)}
          onRestore={() => void removal.restoreMaterial(table)}
        />
      </TableCell>
    </TableRow>
  )
}
