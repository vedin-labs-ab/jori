import { Link } from "@tanstack/react-router"
import { Plus, Table2, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { countLabel } from "@/lib/count"
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
import { MaterialScopeBadge } from "../shared/materials/scope"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
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
  removal,
  tables,
  unauthorizedMessage,
}: {
  hasFilters: boolean
  onCreate: () => void
  onImport: () => void
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
            <TableHead>Scope</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table) => (
            <TableListRow key={table.tableId} removal={removal} table={table} />
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
  removal,
  table,
}: {
  removal: ReturnType<typeof useTableRemoval>
  table: TableSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <Link
          className="block truncate font-medium hover:underline"
          params={{ tableId: table.tableId }}
          title={table.name}
          to="/tables/$tableId"
        >
          {table.name}
        </Link>
        {table.description === undefined ? null : (
          <p
            className="truncate text-muted-foreground"
            title={table.description}
          >
            {table.description}
          </p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {countLabel(table.columns.length, "column")}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <MaterialScopeBadge scope={table.scope} />
          {table.archivedAt === undefined ? null : (
            <Badge variant="secondary">Archived</Badge>
          )}
        </span>
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
          onRestore={() => void removal.restoreTable(table)}
        />
      </TableCell>
    </TableRow>
  )
}
