import { useQuery } from "convex/react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { type MoveResourceTarget } from "../folders/types"
import { ConsolePage } from "../page"
import { SelectionActionsBar } from "../shared/list/bar"
import {
  type ListConfig,
  type ListControls,
  resettingControls,
  useListControls,
} from "../shared/list/controls"
import { ConsoleListFooter, ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { type RowSelection, useRowSelection } from "../shared/list/selection"
import { useFolderNames } from "../shared/materials/folders"
import { bulkMaterialRemoval } from "../shared/materials/removal"
import { CreateStoreDialog } from "./create"
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

function useStoreRows(organizationId: string, query: string) {
  const storeList = useQuery(api.stores.console.list, {
    organizationId,
    query,
    includeArchived: false,
  })

  return {
    storeList,
    rows: storeList?.status === "ready" ? storeList.stores : [],
  }
}

/** One bag of page state, so the view and its overlays stay small. */
function useStoresPage(organizationId: string) {
  const [query, setQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [moving, setMoving] = useState<MoveResourceTarget[]>()
  const removal = useStoreRemoval(organizationId)
  const folders = useFolderNames(organizationId)
  const deferredQuery = useDeferredValue(query)
  const { storeList, rows } = useStoreRows(organizationId, deferredQuery)
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
    folders,
    hasFilters,
    isCreateOpen,
    moving,
    pagination,
    query,
    removal,
    selection,
    setIsCreateOpen,
    setMoving,
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
        onCreate={() => page.setIsCreateOpen(true)}
        onMoveToFolder={(store) => page.setMoving([toMoveTarget(store)])}
        pagination={page.pagination}
        removal={page.removal}
        selection={page.selection}
        storeList={page.storeList}
      />
      <StoresOverlays organizationId={organizationId} page={page} />
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
  onCreate,
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
  onCreate: () => void
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
        onCreate={onCreate}
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
