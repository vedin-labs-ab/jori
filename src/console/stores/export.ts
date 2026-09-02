import { type ConvexReactClient } from "convex/react"
import { type GenericId } from "convex/values"
import { type StoreDetail } from "@/shared/console/stores/types"
import { downloadTextFile, toFilename } from "@/shared/files/download"
import { api } from "../../../convex/_generated/api"

/** The store's current value as pretty-printed JSON, newline-terminated. */
export function buildJsonExport(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/** Download the store's current value as `<store-name>.json`. The value
 *  already rides along on the detail query, so no fetch is needed. */
export function exportStoreJson(store: StoreDetail) {
  downloadTextFile(
    toFilename(store.name, "json"),
    buildJsonExport(store.value),
    "application/json"
  )
}

/** Export a store the caller only knows by id — the list page's bulk
 *  download — by fetching its current value first. */
export async function exportStoreById(
  convex: ConvexReactClient,
  organizationId: string,
  storeId: GenericId<"collections">
) {
  const result = await convex.query(api.stores.console.get, {
    organizationId,
    storeId,
  })

  if (result.store === null) {
    throw new Error("Store was not found")
  }

  exportStoreJson(result.store)
}
