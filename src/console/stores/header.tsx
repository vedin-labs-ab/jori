import { Download, Link2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { MaterialActions } from "../shared/materials/actions"
import { MaterialScopeBadge } from "../shared/materials/scope"
import { storeDeleteDescription, type useStoreRemoval } from "./manage"
import { type StoreDetail } from "./types"

export function StoreHeaderActions({
  onDelete,
  onEdit,
  onExport,
  onShare,
  removal,
  store,
}: {
  onDelete: () => void
  onEdit: () => void
  onExport: () => void
  onShare: () => void
  removal: ReturnType<typeof useStoreRemoval>
  store: StoreDetail
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleHeaderButton
        icon={<Link2 />}
        label="Share"
        onClick={onShare}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        disabled={store.version === 0}
        icon={<Download />}
        label="Export"
        onClick={onExport}
        type="button"
        variant="outline"
      />
      <ConsoleHeaderButton
        icon={<Pencil />}
        label="Edit store"
        onClick={onEdit}
        type="button"
        variant="outline"
      />
      <MaterialActions
        deleteDescription={storeDeleteDescription}
        isDeleting={removal.removingStoreId === store.storeId}
        isRestoring={removal.restoringStoreId === store.storeId}
        material={{ name: store.name, archivedAt: store.archivedAt }}
        noun="store"
        onDelete={onDelete}
        onRestore={() => void removal.restoreStore(store)}
      />
    </ConsoleHeaderActions>
  )
}

export function StoreHeading({
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
