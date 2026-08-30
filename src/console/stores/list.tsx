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
import { MaterialActions } from "../shared/materials/actions"
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
  onCreate,
  onQueryChange,
  query,
}: {
  onCreate: () => void
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
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
  )
}

export function StoreList({
  config,
  controls,
  folders,
  hasFilters,
  onCreate,
  onMoveToFolder,
  removal,
  selection,
  stores,
  unauthorizedMessage,
}: {
  config: ListConfig<StoreSummary>
  controls: ListControls
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

  if (stores.length === 0 && !hasFilters) {
    return (
      <ConsoleListContent>
        <StoresEmptyState hasFilters={false} onCreate={onCreate} />
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <StoreListHead
        config={config}
        controls={controls}
        selection={selection}
      />
      <TableBody>
        {stores.length === 0 ? (
          <EmptyRow colSpan={9}>
            <StoresEmptyState hasFilters onCreate={onCreate} />
          </EmptyRow>
        ) : (
          stores.map((store) => (
            <StoreListRow
              folders={folders}
              key={store.storeId}
              onMoveToFolder={onMoveToFolder}
              removal={removal}
              selection={selection}
              store={store}
            />
          ))
        )}
      </TableBody>
    </ConsoleListTable>
  )
}

/** The header row is the page's control surface: material facets ride the
 *  Name and Folder columns, every measurable column sorts. */
function StoreListHead({
  config,
  controls,
  selection,
}: {
  config: ListConfig<StoreSummary>
  controls: ListControls
  selection: RowSelection<StoreSummary>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead
          controls={controls}
          facets={facetEntries(config, ["status", "scope"])}
          label="Name"
          sortKey="name"
        />
        <SortHead controls={controls} label="Properties" sortKey="properties" />
        <SortHead controls={controls} label="Version" sortKey="version" />
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["folder"])}
          label="Folder"
        />
        <SortHead controls={controls} label="Created" sortKey="created" />
        <TableHead>Owner</TableHead>
        <SortHead controls={controls} label="Last Updated" sortKey="updated" />
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  )
}

function StoresEmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean
  onCreate: () => void
}) {
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
