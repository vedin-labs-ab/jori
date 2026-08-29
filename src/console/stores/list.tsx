import { Database, Plus } from "lucide-react"
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
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "../shared/layout"
import { SelectionHeadCell, SelectionRowCell } from "../shared/list/bar"
import { FilterableEmptyState } from "../shared/list/empty"
import {
  ConsoleListContent,
  ConsoleListTable,
  ConsoleListToolbar,
} from "../shared/list/frame"
import { type ScopeFilter, scopeFilterOptions } from "../shared/list/scope"
import { type RowSelection } from "../shared/list/selection"
import { MaterialActions } from "../shared/materials/actions"
import {
  type ArchiveFilter,
  archiveFilterOptions,
} from "../shared/materials/archive"
import { MaterialFolderCell } from "../shared/materials/cells/folder"
import { type FolderNames } from "../shared/materials/folders"
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
      <ConsoleListToolbar>
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
      </ConsoleListToolbar>
    </>
  )
}

export function StoreList({
  folders,
  hasFilters,
  onCreate,
  onMoveToFolder,
  removal,
  selection,
  stores,
  unauthorizedMessage,
}: {
  folders: FolderNames | undefined
  hasFilters: boolean
  onCreate: () => void
  onMoveToFolder: (store: StoreSummary) => void
  removal: ReturnType<typeof useStoreRemoval>
  selection: RowSelection<StoreSummary>
  stores: StoreSummary[]
  unauthorizedMessage: string | undefined
}) {
  if (unauthorizedMessage !== undefined) {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load stores</AlertTitle>
          <AlertDescription>{unauthorizedMessage}</AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (stores.length === 0) {
    return (
      <ConsoleListContent>
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
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <TableHeader>
        <TableRow>
          <SelectionHeadCell selection={selection} />
          <TableHead>Name</TableHead>
          <TableHead>Properties</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Folder</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {stores.map((store) => (
          <StoreListRow
            folders={folders}
            key={store.storeId}
            onMoveToFolder={onMoveToFolder}
            removal={removal}
            selection={selection}
            store={store}
          />
        ))}
      </TableBody>
    </ConsoleListTable>
  )
}

function StoreListRow({
  folders,
  onMoveToFolder,
  removal,
  selection,
  store,
}: {
  folders: FolderNames | undefined
  onMoveToFolder: (store: StoreSummary) => void
  removal: ReturnType<typeof useStoreRemoval>
  selection: RowSelection<StoreSummary>
  store: StoreSummary
}) {
  const now = useNow(30_000)

  return (
    <TableRow data-state={selection.isSelected(store) ? "selected" : undefined}>
      <SelectionRowCell
        label={`Select ${store.name}`}
        row={store}
        selection={selection}
      />
      <TableCell>
        <StoreNameCell store={store} />
      </TableCell>
      <TableCell>
        <StorePropertiesCell store={store} />
      </TableCell>
      <TableCell>
        <StoreVersionCell store={store} />
      </TableCell>
      <TableCell>
        <MaterialFolderCell folderId={store.folderId} folders={folders} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(store.createdAt)}
      >
        {relativeTime(store.createdAt, now)}
      </TableCell>
      <TableCell>
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
