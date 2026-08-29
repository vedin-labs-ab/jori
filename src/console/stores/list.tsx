import { Database, Plus } from "lucide-react"
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
  StoreNameCell,
  StoreOwnerCell,
  StorePropertiesCell,
  StoreVersionCell,
} from "./cells"
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
  onCreate,
  onMoveToFolder,
  removal,
  stores,
  unauthorizedMessage,
}: {
  hasFilters: boolean
  onCreate: () => void
  onMoveToFolder: (store: StoreSummary) => void
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
        action={
          <Button onClick={onCreate} type="button">
            <Plus />
            New store
          </Button>
        }
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
            <TableHead>Properties</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <StoreListRow
              key={store.storeId}
              onMoveToFolder={onMoveToFolder}
              removal={removal}
              store={store}
            />
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
  onMoveToFolder,
  removal,
  store,
}: {
  onMoveToFolder: (store: StoreSummary) => void
  removal: ReturnType<typeof useStoreRemoval>
  store: StoreSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <StoreNameCell store={store} />
      </TableCell>
      <TableCell>
        <StorePropertiesCell store={store} />
      </TableCell>
      <TableCell>
        <StoreVersionCell store={store} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(store.createdAt)}
      >
        {relativeTime(store.createdAt, now)}
      </TableCell>
      <TableCell className="max-w-48">
        <StoreOwnerCell store={store} />
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
          onMoveToFolder={() => onMoveToFolder(store)}
          onRestore={() => void removal.restoreStore(store)}
        />
      </TableCell>
    </TableRow>
  )
}
