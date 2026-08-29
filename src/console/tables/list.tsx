import { Plus, Table2, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "../shared/layout"
import { FilterableEmptyState } from "../shared/list/empty"
import { type ScopeFilter, scopeFilterOptions } from "../shared/list/scope"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { MaterialActions } from "../shared/materials/actions"
import {
  type ArchiveFilter,
  archiveFilterOptions,
} from "../shared/materials/archive"
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
  filter,
  onCreate,
  onFilterChange,
  onImport,
  onQueryChange,
  onScopeChange,
  query,
  scope,
}: {
  filter: ArchiveFilter
  onCreate: () => void
  onFilterChange: (filter: ArchiveFilter) => void
  onImport: () => void
  onQueryChange: (query: string) => void
  onScopeChange: (scope: ScopeFilter) => void
  query: string
  scope: ScopeFilter
}) {
  return (
    <>
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
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={onFilterChange}
          options={archiveFilterOptions}
          value={filter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={onScopeChange}
          options={scopeFilterOptions}
          value={scope}
        />
      </ConsoleFilterGroup>
    </>
  )
}

export function TableList({
  hasFilters,
  onCreate,
  onImport,
  onMoveToFolder,
  removal,
  tables,
  unauthorizedMessage,
}: {
  hasFilters: boolean
  onCreate: () => void
  onImport: () => void
  onMoveToFolder: (table: TableSummary) => void
  removal: ReturnType<typeof useTableRemoval>
  tables: TableSummary[]
  unauthorizedMessage: string | undefined
}) {
  if (unauthorizedMessage !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load tables</AlertTitle>
        <AlertDescription>{unauthorizedMessage}</AlertDescription>
      </Alert>
    )
  }

  if (tables.length === 0) {
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

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Columns</TableHead>
            <TableHead>Rows</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table) => (
            <TableListRow
              key={table.tableId}
              onMoveToFolder={onMoveToFolder}
              removal={removal}
              table={table}
            />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

export function TableListSkeleton() {
  return <ConsoleListSkeleton />
}

function TableListRow({
  onMoveToFolder,
  removal,
  table,
}: {
  onMoveToFolder: (table: TableSummary) => void
  removal: ReturnType<typeof useTableRemoval>
  table: TableSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell>
        <TableNameCell table={table} />
      </TableCell>
      <TableCell>
        <TableColumnsCell table={table} />
      </TableCell>
      <TableCell>
        <TableRowsCell table={table} />
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
        <MaterialActions
          deleteDescription={tableDeleteDescription}
          isDeleting={removal.removingTableId === table.tableId}
          isRestoring={removal.restoringTableId === table.tableId}
          material={{ name: table.name, archivedAt: table.archivedAt }}
          noun="table"
          onDelete={() => void removal.removeTable(table)}
          onMoveToFolder={() => onMoveToFolder(table)}
          onRestore={() => void removal.restoreTable(table)}
        />
      </TableCell>
    </TableRow>
  )
}
