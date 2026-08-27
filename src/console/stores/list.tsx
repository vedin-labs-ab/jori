import { Link } from "@tanstack/react-router"
import { Database, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { MaterialScopeBadge } from "../shared/materials/scope"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { storeDeleteDescription, type useStoreRemoval } from "./manage"
import { type StoreSummary } from "./types"

export function StoresToolbar({
  filter,
  onCreate,
  onFilterChange,
  onQueryChange,
  onScopeChange,
  query,
  scope,
}: {
  filter: ArchiveFilter
  onCreate: () => void
  onFilterChange: (filter: ArchiveFilter) => void
  onQueryChange: (query: string) => void
  onScopeChange: (scope: ScopeFilter) => void
  query: string
  scope: ScopeFilter
}) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search stores"
          onValueChange={onQueryChange}
          value={query}
        />
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New store"
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

export function StoreList({
  hasFilters,
  removal,
  stores,
  unauthorizedMessage,
}: {
  hasFilters: boolean
  removal: ReturnType<typeof useStoreRemoval>
  stores: StoreSummary[]
  unauthorizedMessage: string | undefined
}) {
  if (unauthorizedMessage !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load stores</AlertTitle>
        <AlertDescription>{unauthorizedMessage}</AlertDescription>
      </Alert>
    )
  }

  if (stores.length === 0) {
    return (
      <FilterableEmptyState
        description="Schema-backed JSON documents Jori and your team keep state in appear here."
        hasFilters={hasFilters}
        icon={Database}
        noun="stores"
      />
    )
  }

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <StoreListRow key={store.storeId} removal={removal} store={store} />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

export function StoreListSkeleton() {
  return <ConsoleListSkeleton />
}

function StoreListRow({
  removal,
  store,
}: {
  removal: ReturnType<typeof useStoreRemoval>
  store: StoreSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <Link
          className="block truncate font-medium hover:underline"
          params={{ storeId: store.storeId }}
          title={store.name}
          to="/stores/$storeId"
        >
          {store.name}
        </Link>
        {store.description === undefined ? null : (
          <p
            className="truncate text-muted-foreground"
            title={store.description}
          >
            {store.description}
          </p>
        )}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <MaterialScopeBadge scope={store.scope} />
          {store.archivedAt === undefined ? null : (
            <Badge variant="secondary">Archived</Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {store.version === 0 ? "Not written yet" : `v${store.version}`}
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(store.updatedAt)}
      >
        {relativeTime(store.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <MaterialActions
          deleteDescription={storeDeleteDescription}
          isDeleting={removal.removingStoreId === store.storeId}
          isRestoring={removal.restoringStoreId === store.storeId}
          material={{ name: store.name, archivedAt: store.archivedAt }}
          noun="store"
          onDelete={() => void removal.removeStore(store)}
          onRestore={() => void removal.restoreStore(store)}
        />
      </TableCell>
    </TableRow>
  )
}
