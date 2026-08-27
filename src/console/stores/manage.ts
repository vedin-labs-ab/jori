import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useMaterialRemoval } from "../shared/materials/removal"
import { type StoreSummary } from "./types"

type StoreTarget = Pick<StoreSummary, "storeId" | "name" | "archivedAt">

export function useStoreRemoval(organizationId: string) {
  const remove = useMutation(api.stores.console.remove)
  const restore = useMutation(api.stores.console.restore)
  const removal = useMaterialRemoval<StoreTarget>({
    identify: (store) => store.storeId,
    noun: "store",
    remove: (store) => remove({ organizationId, storeId: store.storeId }),
    restore: (store) => restore({ organizationId, storeId: store.storeId }),
  })

  return {
    removeStore: removal.removeMaterial,
    removingStoreId: removal.removingId,
    restoreStore: removal.restoreMaterial,
    restoringStoreId: removal.restoringId,
  }
}

export const storeDeleteDescription =
  "This permanently deletes the store, its schema, and its stored value. Anything that reads it loses access."
