import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { moveTarget } from "@/shared/console/folders/types"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { MaterialPlaceholder } from "@/shared/console/materials/placeholder"
import { closeOnDismiss } from "@/shared/console/retain"
import { exportStoreJson } from "@/shared/console/stores/export"
import { StoreHeaderActions } from "@/shared/console/stores/header"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { type StoreDetail } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { OrganizationVisibilityDialog } from "../shared/visibility/dialog"
import { EditStoreDialog } from "./edit"
import { useStoreRemoval } from "./manage"
import { StoreLinksDialog } from "./share"
import { StoreValue } from "./value"

type StoreDialog = "access" | "edit" | "move" | "share"

/** Member view of one store. The share fork wraps exactly this component,
 *  so it owns everything inside the console chrome. A visitor holding a
 *  share secret who cannot see the store falls back to the share view. */
export function StoreView({
  fallback,
  storeId,
}: {
  fallback?: ReactNode
  storeId: GenericId<"collections">
}) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <StoreViewContent
          fallback={fallback}
          organizationId={organizationId}
          storeId={storeId}
        />
      )}
    </ConsolePage>
  )
}

function StoreViewContent({
  fallback,
  organizationId,
  storeId,
}: {
  fallback: ReactNode | undefined
  organizationId: string
  storeId: GenericId<"collections">
}) {
  const result = useQuery(api.stores.console.get, { organizationId, storeId })

  if (result === undefined) {
    return <MaterialPlaceholder noun="store" status="loading" />
  }

  if (result.status === "unauthorized") {
    return (
      <MaterialPlaceholder
        fallback={fallback}
        message={result.message}
        noun="store"
        status="unauthorized"
      />
    )
  }

  if (result.status === "not_found" || result.store === null) {
    return (
      <MaterialPlaceholder
        fallback={fallback}
        noun="store"
        status="not_found"
      />
    )
  }

  return <StoreReadyView organizationId={organizationId} store={result.store} />
}

function StoreReadyView({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  useMemberUrl()

  const navigate = useNavigate()
  const removal = useStoreRemoval(organizationId)
  const [dialog, setDialog] = useState<StoreDialog>()
  const isArchived = store.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeMaterial(store).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/stores" })
      }
    })
  }

  useMaterialBreadcrumb(
    store.name,
    <MaterialTitleMenu
      deleteDescription={storeDeleteDescription}
      isDeleting={removal.removingId === store.storeId}
      isRestoring={removal.restoringId === store.storeId}
      material={{ name: store.name, archivedAt: store.archivedAt }}
      noun="store"
      onAccess={() => setDialog("access")}
      onDelete={removeAndLeaveWhenDeleted}
      onEdit={() => setDialog("edit")}
      onMoveToFolder={() => setDialog("move")}
      onRestore={() => void removal.restoreMaterial(store)}
    />
  )

  return (
    <ConsoleListLayout>
      <StoreHeaderActions
        onExport={() => exportStoreJson(store)}
        onShare={() => setDialog("share")}
        store={store}
      />
      <StoreValue organizationId={organizationId} store={store} />
      <StoreDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        organizationId={organizationId}
        store={store}
      />
    </ConsoleListLayout>
  )
}

function StoreDialogs({
  dialog,
  onClose,
  organizationId,
  store,
}: {
  dialog: StoreDialog | undefined
  onClose: () => void
  organizationId: string
  store: StoreDetail
}) {
  const closeWhenDismissed = closeOnDismiss(onClose)

  return (
    <>
      <EditStoreDialog
        onOpenChange={closeWhenDismissed}
        organizationId={organizationId}
        store={dialog === "edit" ? store : undefined}
      />
      <OrganizationVisibilityDialog
        noun="store"
        onOpenChange={closeWhenDismissed}
        open={dialog === "access"}
        organizationId={organizationId}
        ownerId={store.ownerId}
        target={{ kind: "store", id: store.storeId }}
        value={store.visibility}
      />
      <StoreLinksDialog
        onOpenChange={closeWhenDismissed}
        open={dialog === "share"}
        organizationId={organizationId}
        storeId={store.storeId}
      />
      <MoveResourceDialog
        onClose={onClose}
        organizationId={organizationId}
        resource={
          dialog === "move"
            ? moveTarget("collection", store.storeId, store)
            : undefined
        }
      />
    </>
  )
}
