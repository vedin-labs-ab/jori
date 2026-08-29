import { Download, Link2, Pencil } from "lucide-react"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../shared/layout"
import { MaterialActions } from "../shared/materials/actions"
import { storeDeleteDescription, type useStoreRemoval } from "./manage"
import { type StoreDetail } from "./types"

export function StoreHeaderActions({
  onDelete,
  onEdit,
  onExport,
  onMoveToFolder,
  onShare,
  removal,
  store,
}: {
  onDelete: () => void
  onEdit: () => void
  onExport: () => void
  onMoveToFolder: () => void
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
        onMoveToFolder={onMoveToFolder}
        onRestore={() => void removal.restoreStore(store)}
      />
    </ConsoleHeaderActions>
  )
}
