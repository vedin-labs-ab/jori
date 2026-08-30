import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ConsoleListLayout } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { MaterialTitleMenu } from "../shared/materials/actions"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { useMemberUrl } from "../shared/materials/fragment"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { EditStoreDialog } from "./edit"
import { exportStoreJson } from "./export"
import { StoreHeaderActions } from "./header"
import { storeDeleteDescription, useStoreRemoval } from "./manage"
import { StoreLinksDialog } from "./share"
import { type StoreDetail } from "./types"
import { StoreValue } from "./value/section"

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
    return (
      <ConsolePageLayout>
        <ConsoleListLoading />
      </ConsolePageLayout>
    )
  }

  if (result.status === "unauthorized") {
    return (
      fallback ?? (
        <ConsolePageLayout>
          <Alert variant="destructive">
            <AlertTitle>Could not load store</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        </ConsolePageLayout>
      )
    )
  }

  if (result.status === "not_found" || result.store === null) {
    return (
      fallback ?? (
        <ConsolePageLayout>
          <Alert>
            <AlertTitle>Store not found</AlertTitle>
            <AlertDescription>
              The store may have been deleted or belongs to another
              organization.
            </AlertDescription>
          </Alert>
        </ConsolePageLayout>
      )
    )
  }

  return <StoreReadyView organizationId={organizationId} store={result.store} />
}

function StoreTitleMenu({
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
  removal,
  store,
}: {
  onAccess: () => void
  onDelete: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  removal: ReturnType<typeof useStoreRemoval>
  store: StoreDetail
}) {
  return (
    <MaterialTitleMenu
      deleteDescription={storeDeleteDescription}
      isDeleting={removal.removingStoreId === store.storeId}
      isRestoring={removal.restoringStoreId === store.storeId}
      material={{ name: store.name, archivedAt: store.archivedAt }}
      noun="store"
      onAccess={onAccess}
      onDelete={onDelete}
      onEdit={onEdit}
      onMoveToFolder={onMoveToFolder}
      onRestore={() => void removal.restoreStore(store)}
    />
  )
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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [isAccessOpen, setIsAccessOpen] = useState(false)
  const isArchived = store.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeStore(store).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/stores" })
      }
    })
  }

  useMaterialBreadcrumb(
    store.name,
    store.visibility.mode,
    <StoreTitleMenu
      onAccess={() => setIsAccessOpen(true)}
      onDelete={removeAndLeaveWhenDeleted}
      onEdit={() => setIsEditOpen(true)}
      onMoveToFolder={() => setIsMoveOpen(true)}
      removal={removal}
      store={store}
    />
  )

  return (
    <ConsoleListLayout>
      <StoreHeaderActions
        onExport={() => exportStoreJson(store)}
        onShare={() => setIsShareOpen(true)}
        store={store}
      />
      <StoreValue organizationId={organizationId} store={store} />
      <StoreDialogs
        isAccessOpen={isAccessOpen}
        isEditOpen={isEditOpen}
        isMoveOpen={isMoveOpen}
        isShareOpen={isShareOpen}
        organizationId={organizationId}
        setIsAccessOpen={setIsAccessOpen}
        setIsEditOpen={setIsEditOpen}
        setIsMoveOpen={setIsMoveOpen}
        setIsShareOpen={setIsShareOpen}
        store={store}
      />
    </ConsoleListLayout>
  )
}

function StoreDialogs({
  isAccessOpen,
  isEditOpen,
  isMoveOpen,
  isShareOpen,
  organizationId,
  setIsAccessOpen,
  setIsEditOpen,
  setIsMoveOpen,
  setIsShareOpen,
  store,
}: {
  isAccessOpen: boolean
  isEditOpen: boolean
  isMoveOpen: boolean
  isShareOpen: boolean
  organizationId: string
  setIsAccessOpen: (open: boolean) => void
  setIsEditOpen: (open: boolean) => void
  setIsMoveOpen: (open: boolean) => void
  setIsShareOpen: (open: boolean) => void
  store: StoreDetail
}) {
  return (
    <>
      <EditStoreDialog
        onOpenChange={setIsEditOpen}
        organizationId={organizationId}
        store={isEditOpen ? store : undefined}
      />
      <VisibilityDialog
        noun="store"
        onOpenChange={setIsAccessOpen}
        open={isAccessOpen}
        organizationId={organizationId}
        ownerId={store.ownerId}
        target={{ kind: "store", id: store.storeId }}
        value={store.visibility}
      />
      <StoreLinksDialog
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
        storeId={store.storeId}
      />
      <MoveResourceDialog
        onClose={() => setIsMoveOpen(false)}
        organizationId={organizationId}
        resource={
          isMoveOpen
            ? {
                resourceType: "collection",
                resourceId: store.storeId,
                name: store.name,
                folderId: store.folderId,
              }
            : undefined
        }
      />
    </>
  )
}
