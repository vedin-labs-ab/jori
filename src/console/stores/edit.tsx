import { useMutation } from "convex/react"
import { EditMaterialDialog } from "@/shared/console/materials/dialogs/edit"
import { type StoreDetail } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { useMaterialUpdate } from "../shared/materials/update"

/** All an edit needs of a store; its summary and its detail both fit. */
export type EditableStore = Pick<
  StoreDetail,
  "description" | "name" | "storeId"
>

/** Rename or describe the store; the schema is edited on the store page. */
export function EditStoreDialog({
  onOpenChange,
  organizationId,
  store,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  store: EditableStore | undefined
}) {
  const update = useMutation(api.stores.console.update)
  const edit = useMaterialUpdate(
    "store",
    (values) =>
      store === undefined
        ? Promise.resolve()
        : update({ organizationId, storeId: store.storeId, ...values }),
    () => onOpenChange(false)
  )

  return (
    <EditMaterialDialog
      blurb="Rename the store or update its description."
      isSaving={edit.isSaving}
      material={store}
      noun="store"
      onOpenChange={onOpenChange}
      onSave={edit.save}
    />
  )
}
