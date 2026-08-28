import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ReactNode, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { useMaterialBreadcrumb } from "../shared/materials/breadcrumb"
import { useMemberUrl } from "../shared/materials/fragment"
import { EditStoreDialog } from "./edit"
import { exportStoreJson } from "./export"
import { StoreHeaderActions, StoreHeading } from "./header"
import { useStoreRemoval } from "./manage"
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
        <ConsoleListSkeleton />
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
  useMaterialBreadcrumb(store.name)

  const navigate = useNavigate()
  const removal = useStoreRemoval(organizationId)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const isArchived = store.archivedAt !== undefined

  function removeAndLeaveWhenDeleted() {
    void removal.removeStore(store).then((succeeded) => {
      if (succeeded && isArchived) {
        void navigate({ to: "/stores" })
      }
    })
  }

  return (
    <ConsolePageLayout>
      <StoreHeaderActions
        onDelete={removeAndLeaveWhenDeleted}
        onEdit={() => setIsEditOpen(true)}
        onExport={() => exportStoreJson(store)}
        onShare={() => setIsShareOpen(true)}
        removal={removal}
        store={store}
      />
      <StoreHeading isArchived={isArchived} store={store} />
      <StoreValue organizationId={organizationId} store={store} />
      <EditStoreDialog
        onOpenChange={setIsEditOpen}
        organizationId={organizationId}
        store={isEditOpen ? store : undefined}
      />
      <StoreLinksDialog
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        organizationId={organizationId}
        storeId={store.storeId}
      />
    </ConsolePageLayout>
  )
}
