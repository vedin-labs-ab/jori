import { useConvex, useMutation } from "convex/react"
import { type RowSelection } from "@/shared/console/list/selection"
import {
  bulkMaterialRemovalSuccess,
  useMaterialRemoval,
} from "@/shared/console/materials/removal"
import { storeNoun } from "@/shared/console/stores/list/config"
import { type StoreSummary } from "@/shared/console/stores/types"
import { api } from "../../../convex/_generated/api"
import { useMaterialBulk } from "../shared/materials/bulk"
import { exportStoreById } from "./export"

type StoreTarget = Pick<StoreSummary, "storeId" | "name" | "archivedAt">

export function useStoreRemoval(organizationId: string) {
  const remove = useMutation(api.stores.console.remove)
  const restore = useMutation(api.stores.console.restore)
  return useMaterialRemoval<StoreTarget>({
    identify: (store) => store.storeId,
    noun: "store",
    remove: (store) => remove({ organizationId, storeId: store.storeId }),
    restore: (store) => restore({ organizationId, storeId: store.storeId }),
  })
}

export function useStoreBulk(
  organizationId: string,
  selection: RowSelection<StoreSummary>
) {
  const convex = useConvex()
  const remove = useMutation(api.stores.console.remove)

  return useMaterialBulk({
    download: (store) => exportStoreById(convex, organizationId, store.storeId),
    noun: storeNoun,
    remove: (store) => remove({ organizationId, storeId: store.storeId }),
    removal: {
      success: (rows) => bulkMaterialRemovalSuccess(rows, storeNoun),
      verb: "remove",
    },
    selection,
  })
}
