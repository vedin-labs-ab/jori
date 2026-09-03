import { useState } from "react"
import { moveTarget } from "@/shared/console/folders/types"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListBody } from "@/shared/console/list/pager"
import { bulkMaterialRemoval } from "@/shared/console/materials/removal"
import { closeOnDismiss } from "@/shared/console/retain"
import { StoreList, StoresToolbar } from "@/shared/console/stores/list"
import {
  storeDeleteDescription,
  storeListConfig,
  storeNoun,
} from "@/shared/console/stores/list/config"
import { type StoreSummary } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { MoveResourcesDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { useMaterialListPage } from "../shared/materials/list"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { CreateStoreDialog } from "./create"
import { EditStoreDialog } from "./edit"
import { useStoreBulk, useStoreRemoval } from "./manage"

export function StoresPage() {
  return (
    <ConsolePage>
      {(organizationId) => <StoresView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function useStoresPage(organizationId: string) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const page = useMaterialListPage({
    config: storeListConfig,
    identify: (store: StoreSummary) => store.storeId,
    listQuery: api.stores.console.list,
    noun: storeNoun,
    organizationId,
    rowsOf: (result) => (result.status === "ready" ? result.stores : []),
  })

  return {
    ...page,
    bulk: useStoreBulk(organizationId, page.selection),
    isCreateOpen,
    removal: useStoreRemoval(organizationId),
    setIsCreateOpen,
  }
}

function StoresView({ organizationId }: { organizationId: string }) {
  const page = useStoresPage(organizationId)
  const openCreate = () => page.setIsCreateOpen(true)

  return (
    <ConsoleListLayout>
      <StoresToolbar
        onCreate={openCreate}
        onQueryChange={page.setQueryAndReset}
        query={page.query}
      />
      <ConsoleListBody
        isLoading={page.list === undefined}
        pagination={page.list?.status === "ready" ? page.pagination : undefined}
      >
        <StoreList
          config={page.config}
          controls={page.controls}
          folders={page.folders}
          hasFilters={page.hasFilters}
          onAccess={page.setSharing}
          onCreate={openCreate}
          onEdit={page.setEditing}
          onMoveToFolder={(store) => page.setMoving([toMoveTarget(store)])}
          removal={page.removal}
          selection={page.selection}
          stores={page.pagination.visibleRows}
          unauthorizedMessage={
            page.list?.status === "unauthorized" ? page.list.message : undefined
          }
        />
      </ConsoleListBody>
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

/** What a row's Rename… and Sharing… open, hosted once for the list. */
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
        onOpenChange={closeOnDismiss(() => page.setEditing(undefined))}
        organizationId={organizationId}
        store={page.editing}
      />
      {page.sharing === undefined ? null : (
        <OrganizationVisibilityDialog
          noun="store"
          onOpenChange={closeOnDismiss(() => page.setSharing(undefined))}
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

function toMoveTarget(store: StoreSummary) {
  return moveTarget("collection", store.storeId, store)
}
