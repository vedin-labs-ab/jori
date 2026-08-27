import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { ChevronsUpDown, Pencil } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { api } from "../../../convex/_generated/api"
import { type Id } from "../../../convex/_generated/dataModel"
import { ConsolePage } from "../page"
import { JsonBlock } from "../shared/code"
import { CopyButton } from "../shared/copy"
import { DetailFrame } from "../shared/details"
import { formatJsonText } from "../shared/json/parse"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
} from "../shared/layout"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { MaterialActions } from "../shared/materials/actions"
import { MaterialScopeBadge } from "../shared/materials/scope"
import { EditStoreDialog } from "./edit"
import { storeDeleteDescription, useStoreRemoval } from "./manage"
import { type StoreDetail } from "./types"
import { StoreValue } from "./value"

/** Member view of one store. The later share fork wraps exactly this
 *  component, so it owns everything inside the console chrome. */
export function StoreView({ storeId }: { storeId: Id<"stores"> }) {
  return (
    <ConsolePage>
      {(organizationId) => (
        <StoreViewContent organizationId={organizationId} storeId={storeId} />
      )}
    </ConsolePage>
  )
}

function StoreViewContent({
  organizationId,
  storeId,
}: {
  organizationId: string
  storeId: Id<"stores">
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
      <ConsolePageLayout>
        <Alert variant="destructive">
          <AlertTitle>Could not load store</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      </ConsolePageLayout>
    )
  }

  if (result.status === "not_found" || result.store === null) {
    return (
      <ConsolePageLayout>
        <Alert>
          <AlertTitle>Store not found</AlertTitle>
          <AlertDescription>
            The store may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      </ConsolePageLayout>
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
  const navigate = useNavigate()
  const removal = useStoreRemoval(organizationId)
  const [isEditOpen, setIsEditOpen] = useState(false)
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
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          icon={<Pencil />}
          label="Edit store"
          onClick={() => setIsEditOpen(true)}
          type="button"
          variant="outline"
        />
        <MaterialActions
          deleteDescription={storeDeleteDescription}
          isDeleting={removal.removingStoreId === store.storeId}
          isRestoring={removal.restoringStoreId === store.storeId}
          material={{ name: store.name, archivedAt: store.archivedAt }}
          noun="store"
          onDelete={removeAndLeaveWhenDeleted}
          onRestore={() => void removal.restoreStore(store)}
        />
      </ConsoleHeaderActions>
      <StoreHeading isArchived={isArchived} store={store} />
      <SchemaSection store={store} />
      <StoreValue organizationId={organizationId} store={store} />
      <EditStoreDialog
        onOpenChange={setIsEditOpen}
        organizationId={organizationId}
        store={isEditOpen ? store : undefined}
      />
    </ConsolePageLayout>
  )
}

function StoreHeading({
  isArchived,
  store,
}: {
  isArchived: boolean
  store: StoreDetail
}) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium text-lg tracking-tight">{store.name}</h2>
        <MaterialScopeBadge scope={store.scope} />
        {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      {store.description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{store.description}</p>
      )}
      {isArchived ? (
        <p className="text-muted-foreground text-xs">
          Archived stores are read-only. Restore the store to write again.
        </p>
      ) : null}
    </div>
  )
}

/** The schema is fixed at creation, so it reads as a collapsed reference. */
function SchemaSection({ store }: { store: StoreDetail }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <DetailFrame
        action={
          <CopyButton label="schema" value={formatJsonText(store.schema)} />
        }
        header={
          <CollapsibleTrigger asChild>
            <Button
              className="-ml-2 text-muted-foreground"
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronsUpDown />
              Schema
            </Button>
          </CollapsibleTrigger>
        }
      >
        <CollapsibleContent>
          <JsonBlock value={store.schema} />
        </CollapsibleContent>
      </DetailFrame>
    </Collapsible>
  )
}
