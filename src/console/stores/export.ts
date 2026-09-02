import { type ConvexReactClient } from "convex/react"
import { type GenericId } from "convex/values"
import { exportStoreJson } from "@/shared/console/stores/export"
import { api } from "../../../convex/_generated/api"

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
