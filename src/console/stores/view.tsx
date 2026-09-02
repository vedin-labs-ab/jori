import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { useMemberUrl } from "@/shared/console/materials/fragment"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { type StoreDetail } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import { VisibilityDialog } from "../shared/visibility/dialog"
import { EditStoreDialog } from "./edit"
import { exportStoreJson } from "./export"
import { StoreHeaderActions } from "./header"
import { useStoreRemoval } from "./manage"
import { StoreLinksDialog } from "./share"
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
      onAccess={() => setIsAccessOpen(true)}
      onDelete={removeAndLeaveWhenDeleted}
      onEdit={() => setIsEditOpen(true)}
      onMoveToFolder={() => setIsMoveOpen(true)}
      onRestore={() => void removal.restoreMaterial(store)}
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
