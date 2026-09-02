import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { useFolderNames } from "@/console/shared/materials/names"
import { type MoveResourceTarget } from "@/shared/console/folders/types"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import {
  type ListConfig,
  type ListControls,
  resettingControls,
  useListControls,
} from "@/shared/console/list/controls"
import {
  ConsoleListFooter,
  ConsoleListLayout,
} from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { ConsoleListPager } from "@/shared/console/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import {
  type RowSelection,
  useRowSelection,
} from "@/shared/console/list/selection"
import { bulkMaterialRemoval } from "@/shared/console/materials/removal"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { CreateStoreDialog } from "./create"
import { EditStoreDialog } from "./edit"
import { StoreList, StoresToolbar } from "./list"
import {
  storeDeleteDescription,
  storeListConfig,
  storeNoun,
  useStoreBulk,
  useStoreRemoval,
} from "./manage"
import { type StoreListResult, type StoreSummary } from "./types"

export function StoresPage() {
  return (
    <ConsolePage>
      {(organizationId) => <StoresView organizationId={organizationId} />}
    </ConsolePage>
  )
}

/** One bag of page state, so the view and its overlays stay small. */
function useStoresPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StoreSummary>()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const [sharing, setSharing] = useState<StoreSummary>()
  const removal = useStoreRemoval(organizationId)
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const storeList = useQuery(api.stores.console.list, {
    organizationId,
    query: deferredQuery,
    includeArchived: false,
  })
  const rows = storeList?.status === "ready" ? storeList.stores : []
  const config = storeListConfig(folders, rows)
  const controls = useListControls(config)
  const stores = controls.apply(rows)
  const hasFilters = query.trim() !== "" || controls.hasActiveControls
  const pagination = useClientPagination({
    hasFilters,
    isReady: storeList?.status === "ready",
    itemLabel: storeNoun,
    items: stores,
  })
  const selection = useRowSelection({
    identify: (store: StoreSummary) => store.storeId,
    rows: pagination.visibleRows,
  })

  return {
    bulk: useStoreBulk(organizationId, selection),
    config,
    controls: resettingControls(controls, pagination.reset),
    editing,
    folders,
    hasFilters,
    isCreateOpen,
    moving,
    pagination,
    query,
    removal,
    selection,
    setEditing,
    setIsCreateOpen,
    setMoving,
    setSharing,
    sharing,
    setQueryAndReset: useResettingSetter(setQuery, pagination.reset),
    storeList,
  }
}

function StoresView({ organizationId }: { organizationId: string }) {
  const page = useStoresPage(organizationId)

  return (
    <ConsoleListLayout>
      <StoresToolbar
        onCreate={() => page.setIsCreateOpen(true)}
        onQueryChange={page.setQueryAndReset}
        query={page.query}
      />
      <StoresBody
        config={page.config}
        controls={page.controls}
        folders={page.folders}
        hasFilters={page.hasFilters}
        onAccess={page.setSharing}
        onCreate={() => page.setIsCreateOpen(true)}
        onEdit={page.setEditing}
        onMoveToFolder={(store) => page.setMoving([toMoveTarget(store)])}
        pagination={page.pagination}
        removal={page.removal}
        selection={page.selection}
        storeList={page.storeList}
      />
      <StoresOverlays organizationId={organizationId} page={page} />
      <StoreRowDialogs organizationId={organizationId} page={page} />
    </ConsoleListLayout>
  )
}

/** The selection bar and the page's dialogs — everything that floats over
 *  the list. */
function StoresOverlays({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useStoresPage>
}) {
  return (
    <>
      <SelectionActionsBar
        count={page.selection.count}
        isBusy={page.bulk.isBusy}
        noun={storeNoun}
        onClear={page.selection.clear}
        onDownload={page.bulk.downloadSelected}
        onMove={() => page.setMoving(page.selection.selected.map(toMoveTarget))}
        onRemove={page.bulk.removeSelected}
        removal={bulkMaterialRemoval(
          page.selection.selected,
          storeNoun,
          storeDeleteDescription
        )}
      />
      <CreateStoreDialog
        isOpen={page.isCreateOpen}
        onOpenChange={page.setIsCreateOpen}
        organizationId={organizationId}
      />
      <MoveResourcesDialog
        onClose={() => page.setMoving(undefined)}
        organizationId={organizationId}
        resources={page.moving}
      />
    </>
  )
}

/** What a row's Edit details and Sharing… open, hosted once for the list. */
function StoreRowDialogs({
  organizationId,
  page,
}: {
  organizationId: string
  page: ReturnType<typeof useStoresPage>
}) {
  return (
    <>
      <EditStoreDialog
        onOpenChange={(open) => {
          if (!open) {
            page.setEditing(undefined)
          }
        }}
        organizationId={organizationId}
        store={page.editing}
      />
      {page.sharing === undefined ? null : (
        <VisibilityDialog
          noun="store"
          onOpenChange={(open) => {
            if (!open) {
              page.setSharing(undefined)
            }
          }}
          open
          organizationId={organizationId}
          ownerId={page.sharing.ownerId}
          target={{ kind: "store", id: page.sharing.storeId }}
          value={page.sharing.visibility}
        />
      )}
    </>
  )
}

function toMoveTarget(store: StoreSummary): MoveResourceTarget {
  return {
    resourceType: "collection",
    resourceId: store.storeId,
    name: store.name,
    folderId: store.folderId,
  }
}

function StoresBody({
  config,
  controls,
  folders,
  hasFilters,
  onAccess,
  onCreate,
  onEdit,
  onMoveToFolder,
  pagination,
  removal,
  selection,
  storeList,
}: {
  config: ListConfig<StoreSummary>
  controls: ListControls
  folders: ReturnType<typeof useFolderNames>
  hasFilters: boolean
  onAccess: (store: StoreSummary) => void
  onCreate: () => void
  onEdit: (store: StoreSummary) => void
  onMoveToFolder: (store: StoreSummary) => void
  pagination: ReturnType<typeof useClientPagination<StoreSummary>>
  removal: ReturnType<typeof useStoreRemoval>
  selection: RowSelection<StoreSummary>
  storeList: StoreListResult | undefined
}) {
  if (storeList === undefined) {
    return <ConsoleListLoading />
  }

  return (
    <>
      <StoreList
        config={config}
        controls={controls}
        folders={folders}
        hasFilters={hasFilters}
        onAccess={onAccess}
        onCreate={onCreate}
        onEdit={onEdit}
        onMoveToFolder={onMoveToFolder}
        removal={removal}
        selection={selection}
        stores={pagination.visibleRows}
        unauthorizedMessage={
          storeList.status === "unauthorized" ? storeList.message : undefined
        }
      />
      {storeList.status === "ready" ? (
        <ConsoleListFooter>
          <ConsoleListPager pagination={pagination} />
        </ConsoleListFooter>
      ) : null}
    </>
  )
}
