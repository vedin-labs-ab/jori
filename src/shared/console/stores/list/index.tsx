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
} from "@/shared/console/layout"
import { SelectionHeadCell, SelectionRowCell } from "@/shared/console/list/bar"
import {
  facetEntries,
  type ListConfig,
  type ListControls,
} from "@/shared/console/list/controls"
import { EmptyRow, FilterableEmptyState } from "@/shared/console/list/empty"
import {
  ConsoleListContent,
  ConsoleListTable,
} from "@/shared/console/list/frame"
import { FilterHead, SortHead } from "@/shared/console/list/head"
import { type RowSelection } from "@/shared/console/list/selection"
import { MaterialRowMenu } from "@/shared/console/materials/actions/menu"
import { MaterialFolderCell } from "@/shared/console/materials/cells/folder"
import { type FolderNames } from "@/shared/console/materials/folders"
import { absoluteTime, relativeTime, useNow } from "@/shared/console/time"
import { type MaterialRemoval } from "../../materials/removal"
import { type StoreSummary } from "../types"
import {
  StoreNameCell,
  StoreOwnerCell,
  StorePropertiesCell,
  StoreVersionCell,
} from "./cells"
import { storeDeleteDescription } from "./config"

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
  onAccess,
  onCreate,
  onEdit,
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
  onAccess: (store: StoreSummary) => void
  onCreate: () => void
  onEdit: (store: StoreSummary) => void
  onMoveToFolder: (store: StoreSummary) => void
  removal: MaterialRemoval<StoreSummary>
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
              onAccess={onAccess}
              onEdit={onEdit}
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
        <SortHead controls={controls} label="Name" sortKey="name" />
        <SortHead controls={controls} label="Properties" sortKey="properties" />
        <SortHead controls={controls} label="Version" sortKey="version" />
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
      description="JSON documents Jori and your team keep state in appear here."
      hasFilters={hasFilters}
      icon={Database}
      noun="stores"
    />
  )
}

function StoreListRow({
  folders,
  onAccess,
  onEdit,
  onMoveToFolder,
  removal,
  selection,
  store,
}: {
  folders: FolderNames | undefined
  onAccess: (store: StoreSummary) => void
  onEdit: (store: StoreSummary) => void
  onMoveToFolder: (store: StoreSummary) => void
  removal: MaterialRemoval<StoreSummary>
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
        <MaterialRowMenu
          deleteDescription={storeDeleteDescription}
          isDeleting={removal.removingId === store.storeId}
          isRestoring={removal.restoringId === store.storeId}
          material={{ name: store.name, archivedAt: store.archivedAt }}
          noun="store"
          onAccess={() => onAccess(store)}
          onDelete={() => void removal.removeMaterial(store)}
          onEdit={() => onEdit(store)}
          onMoveToFolder={() => onMoveToFolder(store)}
          onRestore={() => void removal.restoreMaterial(store)}
        />
      </TableCell>
    </TableRow>
  )
}
